"""Run libpq tools with credentials in child environment, never command args."""
import os,sys,subprocess
from urllib.parse import urlsplit,parse_qsl,unquote
name=sys.argv[1]
u=urlsplit(os.environ[name])
if u.scheme not in ('postgres','postgresql') or not u.hostname or not u.path.strip('/'):
 raise SystemExit('Expected PostgreSQL URL')
local=os.environ.get('LOCAL_RECOVERY_TEST')=='yes'
if local and u.hostname not in ('localhost','127.0.0.1','::1'):
 raise SystemExit('Local recovery override requires loopback PostgreSQL')
if local and name=='RESTORE_DATABASE_URL' and not u.path.lstrip('/').startswith('carhub_restore_test_'):
 raise SystemExit('Local restore target must use carhub_restore_test_ prefix')
env=dict(os.environ)
env.update(PGHOST=u.hostname,PGPORT=str(u.port or 5432),PGDATABASE=unquote(u.path.lstrip('/')),PGSSLMODE='disable' if local else 'verify-full')
if u.username is not None: env['PGUSER']=unquote(u.username)
if u.password is not None: env['PGPASSWORD']=unquote(u.password)
for key,value in parse_qsl(u.query):
 if key=='sslrootcert': env['PGSSLROOTCERT']=value
command=sys.argv[2:]
if command[0]=='pg_restore': command=[command[0],'--dbname',env['PGDATABASE'],*command[1:]]
raise SystemExit(subprocess.run(command,env=env).returncode)
