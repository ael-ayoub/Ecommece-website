# Product Image Local Storage Implementation

Generated: 2026-07-20 09:20 GMT

## Summary

Implemented complete Product-owned image management using a provider-neutral
storage contract and an operational local filesystem adapter. Admins can
select, preview, upload, order, mark primary, edit alt text, and remove Product
images. Uploaded files persist in a Docker named volume and are exposed only
through a controlled media route. Existing external URL arrays remain
available as a non-destructive compatibility fallback.

Product/SKU pricing, inventory, cart, checkout, authentication semantics,
orders, and the Products listing design were not changed.

## Architecture

### Storage abstraction

`MediaStorage` defines the application-facing operations:

- `save`
- `delete`
- `exists`
- `read`
- `resolvePublicUrl`

`LocalMediaStorage` implements these operations with atomic temporary-file
writes beneath the configured root. Product services never import Node
filesystem APIs. `getMediaStorage()` is the single current driver selection
point.

### Local adapter

The local adapter resolves normalized storage keys beneath
`MEDIA_LOCAL_ROOT`, creates provider-owned subdirectories, writes
collision-resistant server-generated filenames, and rejects traversal or
absolute paths. Runtime files are mounted at `/app/uploads` through the
`media_uploads` named volume.

### Public serving

`GET /media/[...key]`:

1. Normalizes and validates the requested storage key.
2. Requires a corresponding `ProductImage` database record.
3. Reads only from the configured storage adapter.
4. Returns the recorded raster MIME type.
5. Sets immutable caching, `nosniff`, and restrictive CSP headers.
6. Returns a normal 404 for missing database records or files.

Directory listing is not implemented. Files outside the media root cannot be
addressed.

### Database relationships

`ProductImage` belongs to `Product` with `onDelete: Cascade`. Images never
belong to a SKU or ProductVariant.

The existing PostgreSQL `Product.images` column is mapped as
`legacyImageUrls` in Prisma. This preserves all prior URLs without making them
canonical for new uploads.

### Frontend/backend flow

Product creation remains JSON-first:

1. Save the Product and receive its ID.
2. Upload selected files as authenticated multipart data.
3. Persist metadata and provider-independent storage keys.
4. Redirect to the Product list.

If Product creation succeeds but upload fails, the admin is redirected to the
new Product edit page with an explicit recovery notice. Existing Product image
mutations are performed through dedicated admin routes.

## Environment Variables

| Variable | Purpose | Development example | Exposure | Status |
| --- | --- | --- | --- | --- |
| `MEDIA_STORAGE_DRIVER` | Selects installed adapter | `local` | Private/server | Optional; defaults to `local` |
| `MEDIA_LOCAL_ROOT` | Persistent filesystem mount | `/app/uploads` | Private/server | Optional with Docker default |
| `MEDIA_PUBLIC_PATH` | Controlled public route prefix | `/media` | Server response configuration | Optional |
| `MEDIA_PUBLIC_BASE_URL` | Browser-facing media origin | `http://localhost:3000` | Public value, configured server-side | Optional; empty produces relative URLs |
| `MEDIA_MAX_FILE_SIZE_BYTES` | Maximum bytes per image | `5242880` | Private/server; limit passed to form | Optional |
| `MEDIA_ALLOWED_MIME_TYPES` | Allowed raster MIME types | `image/jpeg,image/png,image/webp` | Private/server | Optional |
| `MEDIA_MAX_IMAGES_PER_PRODUCT` | Product image-count ceiling | `8` | Private/server; limit passed to form | Optional |
| `MEDIA_MAX_IMAGE_PIXELS` | Decompression/dimension safety ceiling | `40000000` | Private/server | Optional |
| `RATE_LIMIT_MEDIA_UPLOAD_MAX` | Per-admin/IP uploads per minute | `30` | Private/server | Optional |

No media secrets or filesystem roots are exposed through `NEXT_PUBLIC_*`.
Configuration is parsed centrally and invalid drivers, paths, types, URLs, or
limits fail the readiness path clearly.

## Database Changes

### Model

`ProductImage` fields:

- integer primary key
- Product foreign key
- unique `storageKey`
- normalized original filename metadata
- MIME type and byte size
- width and height
- optional alt text
- deterministic position
- primary flag
- created/updated timestamps

Indexes:

- unique storage key
- unique `(productId, position)`
- Product lookup
- Product/primary lookup
- partial unique database index enforcing one primary image per Product

### Migration

`20260720084924_product_image_local_storage`

The migration is additive. It creates `ProductImage` and its constraints
without deleting or rewriting existing Products or legacy image URLs. Existing
Products with no images remain valid.

Rollback requires dropping the new table and indexes only after application
rollback. Uploaded binaries must be backed up or removed separately. A
database rollback alone does not delete volume files.

## Security Controls

### Authorization

All image-management routes require an active authenticated Admin before
multipart parsing or storage operations. Same-origin mutation protection is
applied. Manual HTTP checks confirmed 401 for anonymous users and 403 for
Clients.

### Request and quantity limits

- A valid `Content-Length` is required.
- Multipart requests above the calculated maximum are rejected before parsing.
- Every `File.size` is checked again in the application layer.
- Product image count is enforced transactionally while the Product row and
  existing image rows are locked.
- Upload attempts participate in the existing in-process rate limiter.

### Content validation

- Only configured JPEG, PNG, and WebP MIME types are accepted.
- SVG, HTML, JavaScript, PDF, archives, executables, and arbitrary data are
  rejected.
- Browser MIME is compared with detected signature/content structure.
- PNG IHDR/IEND structure, JPEG marker/SOF/EOI structure, and WebP RIFF/chunk
  structure are inspected.
- Width, height, and total pixels are validated.
- Spoofed MIME types and malformed data are rejected.

Sharp was requested to provide full decode/re-encode, orientation
normalization, and metadata stripping, but its dependency installation was
not approved after the permitted retry. Consequently, this implementation
does not fully decode pixel streams or strip embedded metadata. Signature,
container structure, dimensions, byte limits, and `nosniff` serving remain
enforced. Adding an approved trusted decoder is the highest-priority remaining
hardening recommendation.

### Filenames and traversal

- Storage filenames use cryptographic UUIDs generated by the server.
- Client filenames are metadata only and are basename-normalized and truncated.
- Absolute paths, dot segments, encoded traversal, backslashes, nulls, and
  empty segments are rejected.
- All resolved paths must remain below the configured media root.
- Atomic temporary writes prevent partially written final files.

### Error handling and logging

API responses never expose upload roots, operating-system usernames, storage
exceptions, binaries, tokens, or headers. Administrative success/failure and
compensation failures use structured logs with Product/image/storage-key
context only.

### Consistency

Upload saves files through the adapter and writes metadata inside the locked
database operation. Any database failure triggers best-effort deletion of
every newly saved key.

Image deletion removes the database record transactionally, deterministically
repositions remaining records, and promotes the first remaining image when
the primary is deleted. The physical file is then removed; cleanup failures
are logged without restoring a broken public database reference.

Permanent Product deletion captures storage keys within the existing guarded
Product transaction, deletes catalog records, then removes the files through
the storage abstraction.

## API Changes

### Upload

`POST /api/admin/products/:productId/images`

Multipart fields:

- `files`: one or more image files
- `altText`: optional repeated text matching file order

Response:

```json
{
  "images": [
    {
      "id": 1,
      "url": "http://localhost:3000/media/products/42/generated.png",
      "altText": "Front view",
      "position": 0,
      "isPrimary": true,
      "mimeType": "image/png",
      "sizeBytes": 1234,
      "width": 800,
      "height": 800
    }
  ]
}
```

### Update metadata/primary

`PATCH /api/admin/products/:productId/images/:imageId`

Accepts optional `altText` and `isPrimary`.

### Delete

`DELETE /api/admin/products/:productId/images/:imageId`

Ownership is verified using both Product and image IDs.

### Reorder

`PATCH /api/admin/products/:productId/images/reorder`

Accepts every current image ID exactly once in the required order.

### Public media

`GET /media/:storageKey`

Returns only recorded media beneath the configured root.

### Product responses

Product DTOs retain the compatible `images: string[]` display URL array and
add ordered `imageRecords`. New records expose resolved URLs, not storage keys,
absolute paths, or original filenames. The compatible URL array puts the
logical primary first; `imageRecords` retains stored position order.

## Frontend Changes

### Admin

The canonical Product form now provides:

- labeled multiple-file selection
- client-side MIME/size/count feedback
- preview URLs that are revoked after use
- pending-file removal and ordering
- existing image display
- primary selection
- alt-text editing
- existing image ordering and deletion
- disabled conflicting controls while saving
- clear partial-create recovery

No drag-and-drop dependency or component library was added.

### Storefront

Product cards continue using the existing primary display URL and deliberate
fallback. The Products listing layout was not redesigned.

Product Detail renders all canonical images in stored order with stable square
containers and meaningful alt text, falling back to existing external URLs or
the existing no-image state.

## Docker Changes

- Added `media_uploads:/app/uploads`.
- Added media environment defaults to the app service.
- The application image prepares writable cache/media directories.
- The app now runs as the built-in non-root `node` user (UID/GID 1000).
- Manual checks confirmed `/app/uploads` is writable by that user.
- Restart, recreation, and rebuild preserve `media_uploads`.
- `docker compose down -v` and `make fclean` remain destructive and remove it.

The media volume must be backed up together with PostgreSQL. Database metadata
without its matching volume, or the volume without metadata, is incomplete.

## Tests

### Unit

`tests/unit/product-image.test.ts` covers:

- valid PNG/JPEG/WebP detection
- MIME mismatch
- malformed content
- byte and pixel limits
- traversal and encoded traversal
- safe original names
- local save/read/exists/delete
- public URL resolution
- primary and ordered display fallback

### Integration

`tests/integration/product-image.integration.test.ts` covers:

- Product without canonical images
- PNG/JPEG/WebP upload
- collision-resistant keys for duplicate original names
- safe database metadata
- maximum image count
- oversized upload rejection
- normalized Product response
- physical file creation
- deterministic reorder
- primary change
- cross-Product deletion rejection
- primary deletion and promotion
- malformed upload rejection
- nonexistent Product rejection
- Product deletion, database cascade, and physical cleanup

### Frontend test layer

The repository has no React component/browser test runner or DOM test
dependencies. No new test framework was introduced solely for this task.
Admin previews, storefront rendering, authentication responses, and
persistence were validated through compilation, production build, service
tests, real HTTP requests, and browser-independent manual flow checks.

## Verification Results

| Command | Result | Important output |
| --- | --- | --- |
| `docker compose config --quiet` | PASS | Compose including `media_uploads` is valid |
| `npx prisma format --schema prisma/schema.prisma` | PASS | Schema formatted |
| `npx prisma validate --schema prisma/schema.prisma` | PASS | Schema valid |
| `npx prisma generate --schema prisma/schema.prisma` | PASS | Prisma Client generated |
| `npx prisma migrate deploy` on development | PASS | Migration applied |
| `npx prisma migrate deploy` on fresh disposable DB | PASS | All 7 migrations applied |
| `npx prisma migrate status` | PASS | Development schema up to date |
| `npm run lint` | PASS | No warnings or errors |
| `npm run typecheck` | PASS | No TypeScript errors |
| `npm run test` with isolated DB | PASS | 25/25 |
| `npm run test:unit` | PASS | 20/20 |
| `npm run test:integration` with isolated DB | PASS | 5/5 |
| strengthened Product-image integration test | PASS | 1/1 |
| targeted Prettier check for every changed TS/TSX file | PASS | All matched files formatted |
| `npm run format:check` | FAIL | Existing script scans generated `.next` files and pre-existing unformatted tests; 54 warnings |
| `npm run build` | PASS | Production build and all new routes compiled |
| `git diff --check` | PASS | No whitespace errors |
| Docker app/database health | PASS | Both healthy; media config included in readiness |

The build retains pre-existing handled `api_request_failed` logs during static
generation when build-time pages cannot call a running API. The build
completed successfully.

## Manual Validation

Actually performed:

- Applied migration to the non-empty development database.
- Applied every migration to a fresh disposable PostgreSQL database.
- Confirmed app runs as non-root UID/GID 1000.
- Confirmed `/app/uploads` is writable.
- Uploaded a real 68-byte PNG through authenticated multipart HTTP.
- Used a traversal-style original filename and confirmed server-generated
  storage naming.
- Confirmed normalized response and successful `/media/*` retrieval.
- Confirmed anonymous upload returns 401.
- Registered a temporary Client and confirmed upload returns 403.
- Deleted the temporary Client.
- Restarted the app and retrieved the same media successfully.
- Force-recreated the app and retrieved the same media successfully.
- Deleted the image through the Admin API and confirmed public retrieval
  returned 404.
- Confirmed the temporary file and ProductImage record were removed.
- Confirmed existing test coverage for Products, SKUs, inventory, cart,
  checkout, orders, customers, categories, and options remains green.

Not manually performed:

- Interactive browser operation of every Product-image form control.
- Production reverse-proxy caching behavior.
- Backup/restore of the named media volume.
- Cloud-provider migration.
- Full pixel decode/metadata-stripping validation because Sharp installation
  was not approved.

## Files Changed

Configuration and operations:

- `.env.example`
- `docker-compose.yml`
- `ecommerce/Dockerfile`
- `README.md`
- `docs/docker-architecture.md`

Database:

- `ecommerce/prisma/schema.prisma`
- `ecommerce/prisma/migrations/20260720084924_product_image_local_storage/migration.sql`
- `ecommerce/prisma/seed.ts`

Storage and application services:

- `ecommerce/src/media/config.ts`
- `ecommerce/src/media/storage.ts`
- `ecommerce/src/media/storage-key.ts`
- `ecommerce/src/media/local-media-storage.ts`
- `ecommerce/src/media/image-file.ts`
- `ecommerce/src/media/index.ts`
- `ecommerce/src/services/product-image.service.ts`
- `ecommerce/src/services/product.service.ts`

API and validation:

- `ecommerce/src/app/api/admin/products/[id]/images/route.ts`
- `ecommerce/src/app/api/admin/products/[id]/images/[imageId]/route.ts`
- `ecommerce/src/app/api/admin/products/[id]/images/reorder/route.ts`
- `ecommerce/src/app/media/[...key]/route.ts`
- `ecommerce/src/app/api/health/route.ts`
- `ecommerce/src/lib/validators.ts`
- `ecommerce/src/types/product.ts`

Admin and storefront:

- `ecommerce/src/components/admin/products/ProductImageManager.tsx`
- `ecommerce/src/components/admin/products/ProductForm.tsx`
- `ecommerce/src/components/products/ProductImage.tsx`
- `ecommerce/src/app/admin/products/new/page.tsx`
- `ecommerce/src/app/admin/products/[id]/page.tsx`
- `ecommerce/src/app/(client)/products/[id]/page.tsx`

Tests and documentation:

- `ecommerce/tests/unit/product-image.test.ts`
- `ecommerce/tests/integration/product-image.integration.test.ts`
- `docs/architecture.md`
- `docs/project-structure.md`
- `docs/admin-dashboard-spec.md`
- this report

## Known Limitations

- Product images only; no SKU/Variant images.
- No video, 3D, editing, AI generation, or media library.
- No drag-and-drop.
- Local storage is the only installed adapter.
- Existing external URL arrays are preserved but not automatically downloaded
  into local storage.
- Full image decode/re-encoding, orientation normalization, metadata stripping,
  and deep decompression-bomb protection require an approved decoder such as
  Sharp.
- Upload rate limiting is process-local, matching the repository’s existing
  limiter; a multi-instance deployment needs a shared limiter.
- Physical deletion failure can leave an orphaned binary. It cannot leave a
  public database reference, and the failure is logged for operational
  cleanup.
- There is no frontend component test harness.
- Repository-wide `format:check` includes generated `.next` output and existing
  unrelated formatting debt.

## Cloud Migration Path

1. Implement a Cloudinary or S3 adapter satisfying `MediaStorage`.
2. Add provider credentials as private server environment variables.
3. Extend the centralized driver selection behind
   `MEDIA_STORAGE_DRIVER`.
4. Keep Product/image services, API DTOs, and admin/storefront components
   unchanged.
5. Copy local files to the provider and update canonical storage keys through
   a separate controlled migration.
6. Verify resolved URLs and only then retire the local volume.

Public hostnames are not stored in new ProductImage records, so changing the
serving origin does not require rewriting every database row.

## Deployment and Backup Notes

1. Back up PostgreSQL and the current media volume.
2. Deploy code, Compose/runtime configuration, and migration together.
3. Run `npx prisma migrate deploy`.
4. Mount durable writable storage at `MEDIA_LOCAL_ROOT`.
5. Set the correct browser-facing `MEDIA_PUBLIC_BASE_URL`.
6. Verify readiness, an Admin upload, media retrieval, and Product deletion.
7. Include both PostgreSQL and media binaries in regular backups.

Do not run `docker compose down -v` in an environment whose Product media must
be preserved.
