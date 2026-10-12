# Store Screenshots Specification & Asset Storyboard — Fider

Ce document définit les spécifications dimensionnelles, les gabarits, ainsi que les textes d'accroche (copywriting marketing) pour la réalisation des séries de captures d'écran destinées à **Apple App Store** et **Google Play Store**.

---

## 1. Exigences Dimensionnelles Officielles (Late 2026 Standards)

### A. Apple App Store (iOS & iPadOS)
| Format d'Appareil | Dimensions Requises (Pixels) | Ratio | Remarques |
| :--- | :--- | :--- | :--- |
| **iPhone 6.7" & 6.9"** (iPhone 16 Pro Max, 15 Pro Max) | **1290 x 2796** ou **1320 x 2868** | 19.5:9 | **Obligatoire** |
| **iPhone 6.5"** (iPhone 11 Pro Max, XS Max) | **1242 x 2688** | 19.5:9 | Recommandé |
| **iPhone 5.5"** (iPhone 8 Plus) | **1242 x 2208** | 16:9 | Optionnel (Compatibilité legacy) |
| **iPad Pro 12.9" / 13"** (6e gén / M4) | **2048 x 2732** | 4:3 | **Obligatoire** si support iPad activé |

### B. Google Play Store (Android)
| Format | Dimensions Recommandées | Contraintes Google Play |
| :--- | :--- | :--- |
| **Smartphone Haute Résolution** | **1080 x 2400** ou **1440 x 3120** | Min 2 captures, max 8. Côté min 1080px. Ratio 16:9 ou 9:20. |
| **Tablette 7 pouces** | **1200 x 1920** | Côté min 1080px |
| **Tablette 10 pouces** | **1600 x 2560** | Côté min 1080px |
| **Image de Bannière (Feature Graphic)** | **1024 x 500** (PNG ou JPEG) | **Obligatoire** sur Google Play |

---

## 2. Storyboard des 5 Captures Clés & Textes d'Accroche

Pour maximiser le taux de conversion sur les stores, nous définissons une séquence narrative de 5 écrans valorisant les forces opérationnelles uniques de Fider.

---

### Écran 1 : Le Cockpit Flotte (Owner Dashboard)
- **Écran capturé :** `app/(owner)/index.tsx` (Tableau de bord avec cartes de stats, taux d'utilisation, véhicules disponibles et alertes).
- **Accroche FR :**  
  **Titre :** Pilotez votre flotte en temps réel  
  **Sous-titre :** Taux d'utilisation, alertes d'assurance et rentabilité à portée de main.
- **Accroche EN :**  
  **Title:** Real-time fleet control  
  **Subtitle:** Monitor utilization, maintenance alerts, and agency revenue on the go.
- **Accroche AR :**  
  **العنوان:** تحكّم كامل في أسطول سياراتك  
  **الوصف:** متابعة فورية لمعدل الإشغال، الصيانة، ومداخيل الوكالة.

---

### Écran 2 : Passations & Opérations du Jour (Agent Cockpit)
- **Écran capturé :** `app/(agent)/index.tsx` (Liste des départs et retours du jour avec badges et filtres de recherche).
- **Accroche FR :**  
  **Titre :** Simplifiez les remises de clés  
  **Sous-titre :** Tous les départs et retours du jour centralisés au comptoir.
- **Accroche EN :**  
  **Title:** Effortless daily handovers  
  **Subtitle:** Manage scheduled arrivals and departures in one fluid workflow.
- **Accroche AR :**  
  **العنوان:** إدارة سلسة لتسليم واستلام السيارات  
  **الوصف:** جدول منظم لجميع عمليات اليوم لتسهيل عمل موظفي الاستقبال.

---

### Écran 3 : L'État des Lieux Contradictoire (Inspection Wizard)
- **Écran capturé :** `app/inspection/wizard.tsx` (Étape 1 & 2 : Jauge au huitième 0/8 à 8/8 et grille des photos de carrosserie).
- **Accroche FR :**  
  **Titre :** État des lieux certifié en 3 minutes  
  **Sous-titre :** Jauge au huitième, relevé kilométrique et photos contradictoires horodatées.
- **Accroche EN :**  
  **Title:** 3-minute certified inspection  
  **Subtitle:** Precise 8-level fuel gauge, odometer reading, and timestamped photos.
- **Accroche AR :**  
  **العنوان:** معاينة تقنية دقيقة في 3 دقائق  
  **الوصف:** مقياس وقود دقيق، عداد الكيلومترات، وصور موثقة لكل جوانب السيارة.

---

### Écran 4 : Signature Électronique & Valeur Légale (Digital Signature Pad)
- **Écran capturé :** `app/inspection/wizard.tsx` (Étape 3 : Pad tactile de signature avec clause D.O.C. et certification).
- **Accroche FR :**  
  **Titre :** Émargement électronique opposable  
  **Sous-titre :** Signature directe sur écran conforme au Dahir des Obligations et Contrats.
- **Accroche EN :**  
  **Title:** Legally binding digital signature  
  **Subtitle:** Direct contradictory sign-off on touchscreen, protecting both parties.
- **Accroche AR :**  
  **العنوان:** توقيع إلكتروني ذو حجية قانونية  
  **الوصف:** مصادقة فورية على شاشة الهاتف تحمي الوكالة والزبون من أي نزاع.

---

### Écran 5 : Coffre-fort Numérique & Pass Conducteur QR (Renter Vault)
- **Écran capturé :** `app/(renter)/vault.tsx` (Pass conducteur QR stylisé et liste des documents sécurisés).
- **Accroche FR :**  
  **Titre :** Le Pass Conducteur & Coffre-fort CNDP  
  **Sous-titre :** Vérification instantanée par QR code et protection souveraine des données.
- **Accroche EN :**  
  **Title:** Digital Driver Pass & Secure Vault  
  **Subtitle:** Instant QR verification and sovereign privacy-first consent management.
- **Accroche AR :**  
  **العنوان:** جواز السائق الإلكتروني والحفظ الآمن  
  **الوصف:** فحص فوري عبر رمز الاستجابة السريعة (QR) وحماية تامة للبيانات الشخصية.

---

## 3. Charte Visuelle des Visuels Marketing (Fider Lux)

- **Palette de fond :** Graphite chaud `#121110` avec dégradé subtil vers `#1C1A18`.
- **Typographie des titres :** Typographie à empattement moderne (style Fraunces / Serif contemporain) en blanc cassé `#F7F6F2`.
- **Accents de contraste :** Violet Fider `#7C5CFC` et Laiton chaud `#D4AF37`.
- **Habillage des écrans :** Utiliser les frames d'appareils officielles Apple (iPhone 16 Pro Max Space Black) et Google (Pixel 9 Pro Obsidian) sans ombrages excessifs.
