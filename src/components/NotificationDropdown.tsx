// تحديث طريقة عرض التاريخ ليكون ميلادي
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ar', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// في أي مكان يتم فيه عرض تاريخ الإشعار مثل:
<span className="text-xs text-gray-400">
  {formatDate(notification.created_at)}
</span> 