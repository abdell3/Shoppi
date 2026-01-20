## 🔍 AUDIT TECHNIQUE DÉTAILLÉ - SHOPPI BACKEND

### 1. MIGRATION PRISMA - ANALYSE COMPLÈTE
**Fichier migration cassé :** `apps/backend/prisma/migrations/20260118192500_refactor_inventory_to_use_product_id/migration.sql`
```
1:82:apps/backend/prisma/migrations/20260118192500_refactor_inventory_to_use_product_id/migration.sql
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productSku_fkey";

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'productId'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "productId" TEXT;
  END IF;
END $$;

UPDATE "Inventory" 
SET "productId" = (
  SELECT "Product"."id" 
  FROM "Product" 
  WHERE "Product"."sku" = "Inventory"."productSku"
:)
WHERE "productId" IS NULL;

DELETE FROM "Inventory" WHERE "productId" IS NULL;

ALTER TABLE "Inventory" ALTER COLUMN "productId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_productId_key" ON "Inventory"("productId");

DROP INDEX IF EXISTS "Inventory_productSku_key";
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'productSku'
  ) THEN
    ALTER TABLE "Inventory" DROP COLUMN "productSku";
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'availableQuantity'
  ) THEN
    ALTER TABLE "Inventory" RENAME COLUMN "availableQuantity" TO "quantity";
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'reservedQuantity'
  ) THEN
    ALTER TABLE "Inventory" DROP COLUMN "reservedQuantity";
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Inventory' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Inventory" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productId_fkey";

ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
**Erreur identifiée :** ligne 18 (`:)`) — le `:` rend la sous-requête invalide (`UPDATE` échoue sur la shadow DB) → P3009.

**Solution exacte (SQL corrigé) :**
```sql
UPDATE "Inventory" 
SET "productId" = (
  SELECT "Product"."id"
  FROM "Product"
  WHERE "Product"."sku" = "Inventory"."productSku"
)
WHERE "productId" IS NULL;
```
Recréer la migration ou éditer la SQL, puis rejouer.

### Commandes Prisma exécutées
- `npx prisma migrate status` (apps/backend) → échec P1001: base `postgres:5432` inaccessible.
- `npx prisma db push --dry-run` indisponible (option non supportée par cette version Prisma).

### 2. MODULE INVENTORY - CODE RÉEL

A. **InventoryController** — endpoints
```
20:129:apps/backend/src/modules/inventory/inventory.controller.ts
@Patch('stock/:sku')
@HttpCode(HttpStatus.OK)
async updateStock(@Param('sku') sku: string, @Body() dto: UpdateStockDeltaDto)

@Get('out-of-stock')
@HttpCode(HttpStatus.OK)
async getOutOfStock(@Query() query: OutOfStockQueryDto)
```
- Routes : `PATCH /api/inventory/stock/:sku`, `GET /api/inventory/out-of-stock`.
- Guards globaux : `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` appliqués au contrôleur (donc aux deux endpoints).
- Swagger : `@ApiOperation`, `@ApiParam`/`@ApiQuery`, `@ApiResponse` présents pour les deux.

B. **InventoryService** — logique métier
```
16:57:apps/backend/src/modules/inventory/inventory.service.ts
return this.prisma.$transaction(async (tx) => { ... });
```
- `updateStockBySku` :
  - Utilise `prisma.$transaction`.
  - Vérifie produit par SKU, lève `NotFoundException` si absent.
  - Calcule `nextQuantity`; si `< 0` → `BadRequestException('Insufficient stock')`.
  - Crée ou met à jour via repository ; retourne `sku`, `quantity`, `updatedAt`.
- `getOutOfStock` :
  - Pagination `page`/`limit` par défaut (1/20).
  - Appelle `inventoryRepository.findOutOfStock`.
  - Retourne items (quantity=0) avec produit + catégorie, et méta (page, limit, total, totalPages). Pas de gestion `total=0` côté service (le 404 est dans le controller).

C. **InventoryRepository**
```
12:105:apps/backend/src/modules/inventory/repositories/inventory.repository.ts
class InventoryRepository extends BaseRepository ...
```
- Hérite de `BaseRepository`.
- Méthodes :
  - `findByProductId(productId, tx?)`
  - `createForProduct(productId, quantity, tx?)`
  - `updateQuantityByProductId(productId, delta, tx?)`
  - `findOutOfStock({page,limit})` → filtre `quantity: 0`, inclut produit + catégorie, ordre `updatedAt desc`, pagine, retourne `{items,total}`.
- Supporte les transactions via param `tx?: Prisma.TransactionClient`.

D. **Tests E2E (`inventory.e2e-spec.ts`)**
Tests listés :
1) `GET /api/inventory/out-of-stock → 401 sans token` – auth.
2) `GET /api/inventory/out-of-stock → 403 avec token CLIENT` – rôle client interdit.
3) `GET /api/inventory/out-of-stock → 200 retourne les produits en rupture` – succès admin, présence produit rupture.
4) `GET /api/inventory/out-of-stock → 200 avec pagination (page=1, limit=1)` – pagination explicite.
5) `GET /api/inventory/out-of-stock → 200 avec pagination par défaut (page=1, limit=20)` – valeurs par défaut.
6) `GET /api/inventory/out-of-stock → 404 si aucun produit en rupture` – lève 404 quand vide.
7) `GET /api/inventory/out-of-stock → 200 ne retourne que les produits avec quantity = 0` – exclut stock >0.

Couverture :
- ADMIN vs CLIENT (401/403) testé.
- Pas de test PATCH SKU (aucun test 404/400/403 sur update stock, pas de test insuffisance stock).
- Rupture stock paginée et filtre quantity=0 testés ; pagination couverte.

### 3. CONFORMITÉ CAHIER DE CHARGE

User Story 1 (MAJ stock manuel par SKU)
- SKU unique : ✅ (`Product.sku @unique` dans `schema.prisma`).
- Endpoint PATCH existant : ✅ `PATCH /api/inventory/stock/:sku`.
- Sécurité ADMIN : ✅ Guards + `@Roles(UserRole.ADMIN)` sur le contrôleur.
- Validation delta ± : ✅ `@IsInt`, `@NotEquals(0)` (accepte positif/négatif, interdit 0).
- Vérification stock ≥ 0 : ✅ `nextQuantity < 0` → `BadRequestException('Insufficient stock')`.

Manque de tests sur ce flux (no E2E for PATCH) → risque non vérifié.

User Story 2 (liste rupture de stock)
- Endpoint GET /out-of-stock : ✅ présent.
- Filtre quantity = 0 : ✅ `where: { quantity: 0 }`.
- Pagination : ✅ `page/limit` avec skip/take et méta.
- Infos produit (nom, SKU, prix, catégorie) : ✅ inclus dans mapping + tests.

### 4. ARCHITECTURE / MODULES
- `inventory.module.ts`: imports `forwardRef(() => CatalogModule)` et `AuthModule`; providers `InventoryService`, `InventoryRepository`; export : aucun (ok, dépend sur Catalog).
- `catalog.module.ts`: exports `ProductRepository` (et `CategoryRepository`), ce qui couvre l’usage côté inventory via `forwardRef`.
- Pas de boucle circulaire non résolue (forwardRef sur Catalog <- Inventory).

### 5. PROBLÈMES CRITIQUES CLASSÉS
- 🔴 P1 Migration Prisma P3009 : SQL invalide (`:)` dans l’UPDATE) bloque les migrations/shadow DB.
- 🟡 P2 Tests PATCH stock manquants : aucune couverture sur mise à jour stock (pas de 404 SKU, 400 insuffisant, 403 rôle) → risque de régression non détectée.
- 🟡 P3 Commande `prisma db push --dry-run` non supportée par la version actuelle (prévoir `--preview-feature` si version ancienne ou utiliser `prisma migrate deploy/status`).
- 🟢 P4 Pagination/out-of-stock renvoie 404 seulement au controller : cohérent, mais service ne vérifie pas – faible risque.

### 6. PLAN D’ACTION DÉTAILLÉ
- **Migration (urgent)** :
  1) Corriger `migration.sql` (retirer `:`).  
  2) Redémarrer/accéder à la DB (`postgres:5432`).  
  3) `cd apps/backend`  
     - `npx prisma migrate reset --force` (si env de dev) **ou** régénérer une nouvelle migration propre :  
       `npx prisma migrate dev --name fix_inventory_relation`  
  4) `npx prisma migrate status` (vérifier)  
  5) `npx prisma generate`
- **Validation inventory** :
  - Ajouter tests e2e pour PATCH /stock/:sku : succès admin, 404 SKU, 400 stock insuffisant, 403 client.
  - Tester delta négatif limite (ne doit pas passer sous 0).
- **Exécution locale** (après DB up) :
  - `npm run test:e2e modules/inventory` (ou `npm run test:e2e` global).

### 7. COMMANDES À EXÉCUTER (proposées)
```bash
# Démarrer depuis la racine du repo
cd apps/backend

# Vérifier migrations (après avoir démarré Postgres)
npx prisma migrate status

# Si besoin de repartir propre (dev)
npx prisma migrate reset --force
npx prisma migrate dev --name fix_inventory_relation

# Générer le client
npx prisma generate

# Lancer les tests e2e inventory
npm run test:e2e modules/inventory
```

### 8. Points à retenir
- La seule cause du P3009 est syntaxique dans la migration (`:)`), pas un conflit de données.
- Les endpoints requis existent et sont sécurisés côté controller, mais la mise à jour de stock n’est pas couverte par les tests e2e.
- La vue rupture de stock répond au cahier de charge (filtre, pagination, infos produit, 404 si vide).
