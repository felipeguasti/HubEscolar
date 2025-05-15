const handleServiceError = (res, error, defaultMessage = 'Ocorreu um erro interno no servidor.', defaultStatus = 500) => {
    console.error(error); // Log do erro para análise
  
    if (error.response && error.response.data && error.response.status) {
      return res.status(error.response.status).json({ error: error.response.data.error || error.message });
    }
  
    return res.status(defaultStatus).json({ error: error.message || defaultMessage });
  };
  
  module.exports = { handleServiceError };