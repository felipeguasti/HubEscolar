document.addEventListener('DOMContentLoaded', function() {
    const isReportAdmin = window.location.pathname.includes("/reports/headers");
    if (isReportAdmin) {
      function previewImage(input, previewId) {
        if (input.files && input.files[0]) {
          const reader = new FileReader();
          reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
          };
          reader.readAsDataURL(input.files[0]);
        }
      }

      document.getElementById('schoolLogo').addEventListener('change', function() {
        previewImage(this, 'schoolLogoPreview');
      });

      document.getElementById('districtLogo').addEventListener('change', function() {
        previewImage(this, 'districtLogoPreview');
      });

      document.getElementById('headerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        try {
          const response = await fetch('/reports/headers/update', {
            method: 'POST',
            body: formData // FormData will automatically handle the file uploads
          });
          
          if (response.ok) {
            alert('Configurações salvas com sucesso!');
            location.reload();
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar configurações');
          }
        } catch (error) {
          alert('Erro ao salvar: ' + error.message);
        }
      });

      async function deleteHeader() {
        if (!confirm('Tem certeza que deseja excluir as configurações?')) return;
        
        try {
          const response = await fetch('/reports/headers/delete/<%= user.schoolId %>', {
            method: 'DELETE'
          });
          
          if (response.ok) {
            alert('Configurações excluídas com sucesso!');
            location.reload();
          } else {
            throw new Error('Erro ao excluir configurações');
          }
        } catch (error) {
          alert('Erro ao excluir: ' + error.message);
        }
      }
    }        
});