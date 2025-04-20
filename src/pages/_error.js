function Error({ statusCode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {statusCode
              ? `جاري تحميل المحتوى (${statusCode})`
              : 'حدث خطأ في جانب العميل'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            يرجى الانتظار قليلاً
          </p>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 