-- AlterTable
ALTER TABLE "reuniones_seguimiento" ADD COLUMN "estado" TEXT DEFAULT 'programada',
ADD COLUMN "inicio_en_vivo_at" TIMESTAMP(3),
ADD COLUMN "transcripcion" TEXT;
