-- إصلاح مشاكل جدول المهام دون حذف أي بيانات

-- 1. التأكد من أن سياسات RLS صحيحة للجدول tasks
DO $$
BEGIN
  -- إعادة تعريف سياسات RLS للمهام
  DROP POLICY IF EXISTS tasks_update ON tasks;
  
  -- إنشاء سياسة تحديث أكثر تساهلاً للمهام
  CREATE POLICY tasks_update ON tasks
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
    
  -- تحديث سياسة العرض أيضاً
  DROP POLICY IF EXISTS tasks_visibility ON tasks;
  
  CREATE POLICY tasks_visibility ON tasks
    FOR SELECT
    USING (true);
END;
$$;

-- 2. إنشاء دالة وظيفية لتحديث المهام بشكل آمن
CREATE OR REPLACE FUNCTION update_task_safely(
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_priority TEXT,
  p_due_date TIMESTAMP WITH TIME ZONE,
  p_assigned_to UUID,
  p_completion_percentage INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- تحديث المهمة مع التعامل الصحيح مع الأنواع
  UPDATE tasks
  SET
    title = p_title,
    description = p_description,
    status = p_status::task_status,
    priority = p_priority::task_priority,
    due_date = p_due_date,
    assigned_to = p_assigned_to,
    completion_percentage = p_completion_percentage,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING to_jsonb(tasks.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الأذونات المناسبة للدالة الجديدة
GRANT EXECUTE ON FUNCTION update_task_safely TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_safely TO service_role;

-- 3. إنشاء دالة وظيفية للإشعارات مع التحويل الصحيح للأنواع
CREATE OR REPLACE FUNCTION insert_notification_safe(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_related_id UUID,
  p_is_read BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  v_notification_id UUID;
  v_result JSONB;
BEGIN
  -- التحقق من صحة النوع
  IF p_type NOT IN ('task_created', 'task_updated', 'task_assigned', 'task_status_changed', 'task_deleted',
                    'post_created', 'comment_added', 'project_invitation', 'inactivity_alert', 'invitation_accepted') THEN
    RAISE EXCEPTION 'نوع الإشعار غير صالح: %', p_type;
  END IF;

  -- إدخال الإشعار مع التحويل الصريح للنوع
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    related_id,
    is_read,
    created_at
  )
  VALUES (
    p_user_id,
    p_title,
    p_content,
    p_type::notification_type,  -- التحويل الصريح للنوع
    p_related_id,
    p_is_read,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  -- الحصول على بيانات الإشعار المدخل كـ JSON
  SELECT to_jsonb(n.*) INTO v_result
  FROM notifications n
  WHERE n.id = v_notification_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الأذونات المناسبة للدالة الجديدة للإشعارات
GRANT EXECUTE ON FUNCTION insert_notification_safe TO authenticated;
GRANT EXECUTE ON FUNCTION insert_notification_safe TO service_role;

-- 4. إضافة مؤشرات للأعمدة المهمة لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);

-- 5. التأكد من أن الـ Triggers موجودة وتعمل بشكل صحيح
DROP TRIGGER IF EXISTS trigger_update_task_status ON tasks;

CREATE OR REPLACE FUNCTION update_task_status_based_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم تغيير نسبة الإنجاز
  IF NEW.completion_percentage != OLD.completion_percentage THEN
    -- إذا كانت النسبة 100%، تعيين الحالة إلى 'completed'
    IF NEW.completion_percentage = 100 THEN
      NEW.status = 'completed';
    -- إذا كانت النسبة أكبر من 0 ولكن أقل من 100%، تعيين الحالة إلى 'in_progress'
    ELSIF NEW.completion_percentage > 0 THEN
      -- عدم تغيير الحالة إذا كانت بالفعل 'delayed'
      IF NEW.status != 'delayed' THEN
        NEW.status = 'in_progress';
      END IF;
    -- إذا كانت النسبة 0، تعيين الحالة إلى 'not_started'
    ELSE
      -- عدم تغيير الحالة إذا كانت بالفعل 'delayed'
      IF NEW.status != 'delayed' THEN
        NEW.status = 'not_started';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_status
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_status_based_on_completion();

-- 6. إضافة تعليقات توضيحية للجدول وأعمدته
COMMENT ON TABLE tasks IS 'جدول المهام - يحتوي على جميع مهام المشاريع';
COMMENT ON COLUMN tasks.status IS 'حالة المهمة: not_started, in_progress, completed, delayed';
COMMENT ON COLUMN tasks.priority IS 'أولوية المهمة: low, medium, high';

/*
-- تعليمات الاستخدام:
-- 1. قم بتنفيذ هذا الملف بالكامل في محرر SQL في Supabase
-- 2. استخدم الدالة update_task_safely لتحديث المهام
-- 3. استخدم الدالة insert_notification_safe لإرسال الإشعارات

-- مثال على تحديث مهمة:
SELECT update_task_safely(
  '[معرف المهمة]',
  'عنوان المهمة',
  'وصف المهمة',
  'in_progress',
  'medium',
  NOW() + INTERVAL '7 days',
  NULL,
  50
);

-- مثال على إرسال إشعار:
SELECT insert_notification_safe(
  '[معرف المستخدم]',
  'عنوان الإشعار',
  'محتوى الإشعار',
  'task_updated',
  '[معرف المهمة]',
  FALSE
);
*/ 