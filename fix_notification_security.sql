-- إضافة سياسة أمان تسمح بإدراج الإشعارات
CREATE POLICY notifications_insert_policy ON notifications
    FOR INSERT
    WITH CHECK (true);  -- السماح بالإدراج بغض النظر عن المستخدم الحالي

-- تعديل وظيفة إدراج الإشعارات لتتجاوز سياسات الأمان
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_related_id UUID DEFAULT NULL,
  p_is_read BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
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
    p_type::notification_type,  -- تحويل النص إلى نوع بيانات notification_type
    p_related_id,
    p_is_read,
    NOW()
  )
  RETURNING to_jsonb(notifications.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- إضافة SECURITY DEFINER لتجاوز فحص الأمان

-- تعديل وظيفة إشعارات تحديث المهام لتتجاوز سياسات الأمان
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
  project_member_id UUID;
  project_name TEXT;
  creator_name TEXT;
  notification_title TEXT;
  notification_content TEXT;
  notification_type TEXT;
BEGIN
  -- الحصول على اسم المشروع
  SELECT name INTO project_name 
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- الحصول على اسم منشئ المهمة
  SELECT full_name INTO creator_name 
  FROM users 
  WHERE id = NEW.created_by;
  
  -- تحديد نوع التنبيه والمحتوى بناءً على التغييرات
  IF OLD.status != NEW.status THEN
    notification_title := 'تغيير حالة المهمة: ' || NEW.title;
    notification_content := 'تم تغيير حالة المهمة من "' || OLD.status || '" إلى "' || NEW.status || '"';
    notification_type := 'task_status_changed';
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    notification_title := 'تغيير تكليف المهمة: ' || NEW.title;
    notification_content := 'تم تغيير تكليف المهمة في المشروع: ' || project_name;
    notification_type := 'task_assigned';
  ELSE
    notification_title := 'تحديث المهمة: ' || NEW.title;
    notification_content := 'تم تحديث تفاصيل المهمة في المشروع: ' || project_name;
    notification_type := 'task_updated';
  END IF;
  
  -- إرسال تنبيه لكل عضو في المشروع باستخدام الوظيفة الجديدة
  FOR project_member_id IN (
    SELECT user_id 
    FROM project_members 
    WHERE project_id = NEW.project_id 
    AND user_id != current_user_id() -- استثناء المستخدم الذي قام بالتحديث
  )
  LOOP
    -- استخدام الوظيفة الجديدة بدلاً من الإدراج المباشر
    PERFORM insert_notification(
      project_member_id,
      notification_title,
      notification_content,
      notification_type,
      NEW.id,
      FALSE
    );
  END LOOP;
  
  -- إرسال تنبيه خاص للمستخدم المكلف الجديد إذا تغير
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL 
     AND NEW.assigned_to != current_user_id() THEN
    -- استخدام الوظيفة الجديدة بدلاً من الإدراج المباشر
    PERFORM insert_notification(
      NEW.assigned_to,
      'تم تكليفك بمهمة: ' || NEW.title,
      'تم تكليفك بالعمل على مهمة في المشروع: ' || project_name,
      'task_assigned',
      NEW.id,
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- إضافة SECURITY DEFINER لتجاوز فحص الأمان

-- تعديل الوظيفة المسؤولة عن إضافة تعليق على المهمة
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id UUID,
  p_content TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := current_user_id();
  v_task RECORD;
  v_project_name TEXT;
  v_commenter_name TEXT;
  v_result JSONB;
  v_member_id UUID;
BEGIN
  -- التحقق من وجود المهمة
  SELECT t.*, p.name AS project_name 
  INTO v_task
  FROM tasks t
  JOIN projects p ON t.project_id = p.id
  WHERE t.id = p_task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المهمة غير موجودة';
  END IF;
  
  -- الحصول على اسم المعلق
  SELECT full_name INTO v_commenter_name 
  FROM users 
  WHERE id = v_user_id;
  
  -- إضافة التعليق
  INSERT INTO task_comments (
    task_id,
    user_id,
    content
  ) VALUES (
    p_task_id,
    v_user_id,
    p_content
  )
  RETURNING to_jsonb(task_comments.*) INTO v_result;
  
  -- إرسال إشعار لمنشئ المهمة
  IF v_task.created_by != v_user_id THEN
    PERFORM insert_notification(
      v_task.created_by,
      'تعليق جديد على المهمة: ' || v_task.title,
      'علق ' || v_commenter_name || ' على المهمة في المشروع: ' || v_task.project_name,
      'comment_added',
      p_task_id,
      FALSE
    );
  END IF;
  
  -- إرسال إشعار للشخص المكلف بالمهمة
  IF v_task.assigned_to IS NOT NULL AND v_task.assigned_to != v_user_id THEN
    PERFORM insert_notification(
      v_task.assigned_to,
      'تعليق جديد على المهمة: ' || v_task.title,
      'علق ' || v_commenter_name || ' على المهمة في المشروع: ' || v_task.project_name,
      'comment_added',
      p_task_id,
      FALSE
    );
  END IF;
  
  -- إرسال إشعار لباقي أعضاء المشروع
  FOR v_member_id IN (
    SELECT user_id 
    FROM project_members 
    WHERE project_id = v_task.project_id 
      AND user_id != v_user_id
      AND user_id != v_task.created_by
      AND (v_task.assigned_to IS NULL OR user_id != v_task.assigned_to)
  )
  LOOP
    PERFORM insert_notification(
      v_member_id,
      'تعليق جديد على المهمة: ' || v_task.title,
      'علق ' || v_commenter_name || ' على المهمة في المشروع: ' || v_task.project_name,
      'comment_added',
      p_task_id,
      FALSE
    );
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- إضافة SECURITY DEFINER لتجاوز فحص الأمان

-- تعديل سياسات الأمان الأخرى إذا كانت موجودة
-- تطبيق سياسة تسمح للمستخدم برؤية الإشعارات الخاصة به فقط
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (user_id = current_user_id());
    
-- إضافة دالة RPC يمكن استدعاؤها من الواجهة لإرسال إشعار
CREATE OR REPLACE FUNCTION public.send_notification(
  to_user_id UUID,
  notification_title TEXT,
  notification_content TEXT,
  notification_type TEXT,
  related_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  RETURN insert_notification(
    to_user_id,
    notification_title,
    notification_content,
    notification_type,
    related_id,
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 