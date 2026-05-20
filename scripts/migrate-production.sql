-- Ejecutar UNA VEZ en MySQL de producción (Hostinger, Railway, etc.)
-- cuando TypeORM synchronize está desactivado (NODE_ENV=production).

-- Diapositivas: scripts JSON (Three.js, Leaflet, etc.)
ALTER TABLE slides
  ADD COLUMN scripts JSON NULL;

-- Propuestas: columnas añadidas después del primer despliegue (omitir si ya existen)
-- ALTER TABLE proposals ADD COLUMN is_template TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
-- ALTER TABLE proposals ADD COLUMN theme_config JSON NULL AFTER map_config;
