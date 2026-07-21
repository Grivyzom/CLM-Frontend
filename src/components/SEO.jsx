import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = "KyoCLM", 
  description = "Plataforma de Gestión del Ciclo de Vida de Contratos (Contract Lifecycle Management). Optimiza, automatiza y asegura tus procesos legales.", 
  name = "KyoCLM", 
  type = "website",
  image = "https://kyoclm.com/android-chrome-512x512.png",
  url = "https://kyoclm.com/"
}) => {
  return (
    <Helmet>
      { /* Standard metadata tags */ }
      <title>{title === "KyoCLM" ? title : `${title} | KyoCLM`}</title>
      <meta name='description' content={description} />
      
      { /* Open Graph tags */ }
      <meta property="og:title" content={title === "KyoCLM" ? title : `${title} | KyoCLM`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      
      { /* Twitter tags */ }
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title === "KyoCLM" ? title : `${title} | KyoCLM`} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
