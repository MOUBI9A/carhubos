targetScope = 'resourceGroup'

@allowed(['staging', 'production'])
param stage string = 'staging'
param location string = resourceGroup().location
param prefix string
param frontendImage string
param backendImage string
param migrationImage string
param registryServer string
param registryUsername string
@secure()
param registryPassword string
@secure()
param databasePassword string
param deployApplication bool = false
@secure()
param jwtSecret string
@secure()
param jwtRefreshSecret string
@secure()
param identityPepper string
param allowedOrigin string
// Explicit trusted outbound CIDR endpoints, including ACA outbound IPs. Never 0.0.0.0.
param databaseFirewallRules array = []

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-${stage}-logs'
  location: location
  properties: {
    retentionInDays: 30
    sku: { name: 'PerGB2018' }
  }
}
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-${stage}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}
resource database 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${prefix}-${stage}-pg'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: 'carhubadmin'
    administratorLoginPassword: databasePassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 14, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
}
resource appDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: database
  name: 'carhub'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}
resource firewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [for rule in databaseFirewallRules: {
  parent: database
  name: rule.name
  properties: { startIpAddress: rule.startIpAddress, endIpAddress: rule.endIpAddress }
}]
resource extensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: database
  name: 'azure.extensions'
  properties: { value: 'BTREE_GIST', source: 'user-override' }
}
// Derived from this server: credentials cannot silently point at a different DB.
var databaseUrl = 'postgresql://carhubadmin:${uriComponent(databasePassword)}@${database.properties.fullyQualifiedDomainName}:5432/carhub?sslmode=require'
var secrets = [
  { name: 'registry-password', value: registryPassword }
  { name: 'database-url', value: databaseUrl }
  { name: 'jwt-secret', value: jwtSecret }
  { name: 'jwt-refresh-secret', value: jwtRefreshSecret }
  { name: 'identity-pepper', value: identityPepper }
]
var backendEnv = [
  { name: 'NODE_ENV', value: 'production' }
  { name: 'PORT', value: '5406' }
  { name: 'DATABASE_URL', secretRef: 'database-url' }
  { name: 'DIRECT_DATABASE_URL', secretRef: 'database-url' }
  { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
  { name: 'JWT_REFRESH_SECRET', secretRef: 'jwt-refresh-secret' }
  { name: 'IDENTITY_PEPPER', secretRef: 'identity-pepper' }
  { name: 'ALLOWED_ORIGINS', value: allowedOrigin }
  { name: 'PUBLIC_APP_URL', value: allowedOrigin }
  { name: 'PAYMENT_PROVIDER', value: 'disabled' }
]
// First provision with deployApplication=false, run migration, then enable the app.
resource app 'Microsoft.App/containerApps@2024-03-01' = if (deployApplication) {
  name: '${prefix}-${stage}-app'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secrets
      registries: [{ server: registryServer, username: registryUsername, passwordSecretRef: 'registry-password' }]
      ingress: { external: true, targetPort: 3000, transport: 'http', allowInsecure: false }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: frontendImage
          env: [{ name: 'API_INTERNAL_URL', value: 'http://127.0.0.1:5406' }]
          resources: { cpu: json('0.5'), memory: '1Gi' }
          probes: [{ type: 'Liveness', httpGet: { path: '/login', port: 3000 }, initialDelaySeconds: 30, periodSeconds: 30 }]
        }
        {
          name: 'backend'
          image: backendImage
          env: backendEnv
          resources: { cpu: json('0.5'), memory: '1Gi' }
          probes: [
            { type: 'Liveness', httpGet: { path: '/api/health', port: 5406 }, initialDelaySeconds: 30, periodSeconds: 30 }
            { type: 'Readiness', httpGet: { path: '/api/ready', port: 5406 }, initialDelaySeconds: 5, periodSeconds: 10 }
          ]
        }
      ]
      // Existing scheduled jobs require one replica until a distributed job lock exists.
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}
resource migrate 'Microsoft.App/jobs@2024-03-01' = {
  dependsOn: [appDatabase, extensions, firewall]
  name: '${prefix}-${stage}-migrate'
  location: location
  properties: {
    environmentId: environment.id
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 0
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
      secrets: secrets
      registries: [{ server: registryServer, username: registryUsername, passwordSecretRef: 'registry-password' }]
    }
    template: {
      containers: [{
        name: 'migrate'
        image: migrationImage
        command: ['node', 'node_modules/prisma/build/index.js', 'migrate', 'deploy']
        env: backendEnv
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
    }
  }
}
output appUrl string = deployApplication ? 'https://${app!.properties.configuration.ingress.fqdn}' : ''
output databaseHost string = database.properties.fullyQualifiedDomainName
// This is an ingress address; do not use it as a database egress firewall rule.
output ingressIP string = environment.properties.staticIp
output migrationJob string = migrate.name
