-- Add optional real vehicle imagery. Existing cars remain valid and fall back
-- to the shared placeholder until a seed or owner supplies a URL.
ALTER TABLE "Car" ADD COLUMN "imageUrl" TEXT;
