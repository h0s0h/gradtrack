-- إصلاح مشكلة الترايجر الخاص بإشعارات تحديث المهمة

-- إسقاط الترجير الحالي الذي يسبب المشكلة
DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;

-- إسقاط الدالة المرتبطة بالترجير
DROP FUNCTION IF EXISTS notify_task_update();

-- إنشاء الدالة الجديدة مع معالجة صحيحة للأنواع
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
    project_id_var UUID;
    task_title TEXT;
    project_members UUID[];
    status_map TEXT;
    current_user UUID;
BEGIN
    -- الحصول على المستخدم الحالي
    current_user := auth.uid();
    
    -- الحصول على معرف المشروع وعنوان المهمة
    SELECT projects.id, tasks.title INTO project_id_var, task_title
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE tasks.id = NEW.id;

    -- الحصول على أعضاء المشروع باستثناء الشخص الذي قام بالتحديث
    SELECT array_agg(user_id) INTO project_members
    FROM project_members
    WHERE project_id = project_id_var AND user_id != current_user;
    
    -- التحقق من وجود أعضاء لإرسال الإشعارات إليهم
    IF project_members IS NULL OR array_length(project_members, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- خريطة حالات المهام بالعربية
    CASE NEW.status
        WHEN 'to_do' THEN status_map := 'قيد الانتظار';
        WHEN 'in_progress' THEN status_map := 'قيد التنفيذ';
        WHEN 'in_review' THEN status_map := 'قيد المراجعة';
        WHEN 'done' THEN status_map := 'مكتملة';
        ELSE status_map := NEW.status;
    END CASE;

    -- إرسال إشعار عام بتحديث المهمة
    IF TG_OP = 'UPDATE' AND (
        OLD.title != NEW.title OR 
        OLD.description != NEW.description OR 
        OLD.due_date != NEW.due_date OR 
        OLD.priority != NEW.priority OR
        OLD.completion_percentage != NEW.completion_percentage
    ) THEN
        BEGIN
            -- استخدام الوظيفة المخصصة التي تتعامل مع التحويل بشكل صحيح
            PERFORM insert_notification(
                receiver_id,
                'تم تحديث المهمة: ' || NEW.title,
                'تم تحديث معلومات المهمة',
                'task_updated',
                NEW.id
            )
            FROM unnest(project_members) AS receiver_id;
        EXCEPTION WHEN OTHERS THEN
            -- تسجيل الخطأ ولكن استمرار في تنفيذ الترجير
            RAISE NOTICE 'خطأ في إرسال إشعار تحديث المهمة: %', SQLERRM;
        END;
    END IF;

    -- إشعار بتغيير حالة المهمة
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        BEGIN
            PERFORM insert_notification(
                receiver_id,
                'تم تغيير حالة المهمة: ' || NEW.title,
                'تم تغيير حالة المهمة إلى: ' || status_map,
                'task_status_changed',
                NEW.id
            )
            FROM unnest(project_members) AS receiver_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار تغيير حالة المهمة: %', SQLERRM;
        END;
    END IF;

    -- إشعار بتعيين المهمة لمستخدم جديد
    IF TG_OP = 'UPDATE' AND OLD.assigned_to != NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        BEGIN
            PERFORM insert_notification(
                NEW.assigned_to,
                'تم تعيين مهمة جديدة لك',
                'تم تعيينك للمهمة: ' || NEW.title,
                'task_assigned',
                NEW.id
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار تعيين المهمة: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الترجير
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_update();

-- للتأكد من تطبيق التغييرات، قم بالتنفيذ في محرر SQL في Supabase
-- ثم عد إلى التطبيق وحاول تحديث مهمة 