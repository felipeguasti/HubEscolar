document.addEventListener('DOMContentLoaded', function() {
    const isFeatureDashboard = window.location.pathname.includes("/feature");
    if (isFeatureDashboard) {
        handleAuthCheck();
    }        
});