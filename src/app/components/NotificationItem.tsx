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

// في مكان عرض التاريخ
<span className="text-xs font-medium text-gray-700">
  {formatDate(notification.created_at)}
</span> 