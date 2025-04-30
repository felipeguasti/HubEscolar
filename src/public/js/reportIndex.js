document.addEventListener('DOMContentLoaded', function() {
    const isReportIndex = window.location.pathname.includes("/reports");
    if (isReportIndex) {
        handleAuthCheck();
    }        
});