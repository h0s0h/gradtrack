-- إنشاء جدول لتخزين تفضيلات المستخدمين
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'ar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- إنشاء فهرس لتحسين أداء الاستعلامات
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- تطبيق الترقر لتحديث حقل updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- تفعيل نظام الأمان على مستوى الصفوف (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان

-- سياسة للقراءة - يمكن للمستخدم قراءة تفضيلاته فقط
CREATE POLICY user_preferences_select ON user_preferences
    FOR SELECT
    USING (
        user_id = current_user_id()
    );

-- سياسة للإدراج - يمكن للمستخدم إضافة تفضيلات لنفسه فقط
CREATE POLICY user_preferences_insert ON user_preferences
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id()
    );

-- سياسة للتحديث - يمكن للمستخدم تحديث تفضيلاته فقط
CREATE POLICY user_preferences_update ON user_preferences
    FOR UPDATE
    USING (
        user_id = current_user_id()
    );

-- إنشاء وظيفة لإعادة تفضيلات المستخدم الحالي
CREATE OR REPLACE FUNCTION get_user_preferences()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := current_user_id();
    v_preferences JSONB;
BEGIN
    -- البحث عن تفضيلات المستخدم
    SELECT to_jsonb(up) INTO v_preferences
    FROM user_preferences up
    WHERE up.user_id = v_user_id;
    
    -- إذا لم يتم العثور على تفضيلات، إنشاء تفضيلات افتراضية
    IF v_preferences IS NULL THEN
        INSERT INTO user_preferences (user_id)
        VALUES (v_user_id)
        RETURNING to_jsonb(user_preferences) INTO v_preferences;
    END IF;
    
    RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 