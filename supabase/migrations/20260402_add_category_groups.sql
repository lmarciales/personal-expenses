ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- Helper function: upsert a group category, returning its id.
-- Promotes an existing tag to a group if a category with the same name already
-- exists for the user (handles tags like "Comida" / "Compras" that conflict).
CREATE OR REPLACE FUNCTION _migrate_upsert_group(p_user_id uuid, p_name text, p_color text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE categories
    SET is_group = true, color = p_color
    WHERE user_id = p_user_id AND name = p_name
    RETURNING id INTO v_id;

  IF NOT FOUND THEN
    INSERT INTO categories (user_id, name, is_group, color)
      VALUES (p_user_id, p_name, true, p_color)
      RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

DO $$
DECLARE
  u_id uuid;
  g_id uuid;
BEGIN
  FOR u_id IN (SELECT DISTINCT user_id FROM categories)
  LOOP
    g_id := _migrate_upsert_group(u_id, 'Hogar', '#ef4444');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Luz (Codensa)', 'Gas (Vanti)', 'Agua (Acueducto)', 'ETB', 'Tigo', 'EcoTower', 'CapitalTower');

    g_id := _migrate_upsert_group(u_id, 'Suscripciones', '#22c55e');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Spotify', 'Netflix', 'iCloud', 'Rappi Prime', 'Patreon', 'Crunchyroll', 'True Caller', 'Google', 'Subscription');

    g_id := _migrate_upsert_group(u_id, 'Gaming', '#a855f7');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('MLBB', 'Wings Store', 'SLA', 'FC25', 'FC26', 'EA Play', 'PS5', 'NS2', 'Games', 'MCGG');

    g_id := _migrate_upsert_group(u_id, 'Comida', '#eab308');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Almuerzo', 'El Corral', 'KFC', 'Dominos', 'Mis Carnes Parrilla', 'Il Forno', 'Presto', 'Aprissa Pizza', 'Food', 'Mister Lee');

    g_id := _migrate_upsert_group(u_id, 'Compras', '#3b82f6');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Mercado Libre', 'Amazon', 'Shein', 'Zara', 'Adidas', 'Cafam', 'Bella Piel', 'Natura');

    g_id := _migrate_upsert_group(u_id, 'Transporte', '#f97316');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Uber', 'Gasolina', 'Peugeot', 'Camioneta', 'Pico Y Placa', 'PyP Solidario', 'SOAT');

    g_id := _migrate_upsert_group(u_id, 'Software & Tools', '#06b6d4');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('ChatGPT', 'Claude', 'Cursor', 'Windsurf', 'Grammarly', 'Platzi', 'Fantastical', 'Athlytic', 'Software');

    g_id := _migrate_upsert_group(u_id, 'Viajes', '#ec4899');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Vacaciones', 'Barceló', 'Avianca', 'Vuelos', 'Pasaporte');

    g_id := _migrate_upsert_group(u_id, 'Financiero', '#64748b');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Tarjeta de crédito', 'Paypal', 'Prestamo', 'Declaración de Renta', 'Impuesto', 'Nomina');

    g_id := _migrate_upsert_group(u_id, 'Personal', '#f43f5e');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Cumpleaños', 'Rappi', 'Pagos Ma', 'Colmedica', 'Cine Colombia', 'MiduDev', 'Twitch');

    g_id := _migrate_upsert_group(u_id, 'Servicios', '#8b5cf6');
    UPDATE categories SET parent_id = g_id WHERE user_id = u_id AND NOT is_group AND name IN ('Apple');
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS _migrate_upsert_group(uuid, text, text);
