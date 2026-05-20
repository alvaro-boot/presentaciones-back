-- Ejecutar UNA VEZ en MySQL de producción (Hostinger, Railway, etc.)
-- cuando TypeORM synchronize está desactivado (NODE_ENV=production).

-- Diapositivas: scripts JSON (Three.js, Leaflet, etc.)
ALTER TABLE slides
  ADD COLUMN scripts JSON NULL;

-- Propuestas: tema por propuesta (JSON en theme_config)
-- Ejecutar si la columna no existe (error "Duplicate column" = ya está creada).
ALTER TABLE proposals ADD COLUMN theme_config JSON NULL AFTER map_config;
