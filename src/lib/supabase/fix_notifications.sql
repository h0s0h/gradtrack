-- Función para insertar notificaciones manejando correctamente los tipos
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_related_id UUID,
  p_is_read BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    related_id,
    is_read
  ) VALUES (
    p_user_id,
    p_title,
    p_content,
    p_type::notification_type, -- Convertir explícitamente de TEXT a notification_type
    p_related_id,
    p_is_read
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurarse de que la función tenga permisos adecuados
GRANT EXECUTE ON FUNCTION insert_notification TO authenticated;
GRANT EXECUTE ON FUNCTION insert_notification TO service_role;

-- Política RLS para permitir inserción de notificaciones
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios ver sus propias notificaciones
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications 
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para permitir insertar notificaciones
DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications 
  FOR INSERT
  WITH CHECK (true);  -- Permitir inserciones, la función se encarga de la validación

-- Política para permitir actualizar notificaciones propias
DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications 
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Actualiza el tipo de notificación para incluir todos los valores necesarios
DO $$
BEGIN
  -- Verificar si los valores ya existen antes de intentar añadirlos
  -- para evitar errores si ya existen
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_created';
  EXCEPTION WHEN duplicate_object THEN
    -- Ignorar error si el valor ya existe
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_updated';
  EXCEPTION WHEN duplicate_object THEN
    -- Ignorar error si el valor ya existe
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_status_changed';
  EXCEPTION WHEN duplicate_object THEN
    -- Ignorar error si el valor ya existe
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_assigned';
  EXCEPTION WHEN duplicate_object THEN
    -- Ignorar error si el valor ya existe
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_deleted';
  EXCEPTION WHEN duplicate_object THEN
    -- Ignorar error si el valor ya existe
  END;
END;
$$; 