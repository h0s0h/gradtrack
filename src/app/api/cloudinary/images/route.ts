import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configuración de Cloudinary
const configCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// Función para subir una imagen
export async function POST(req) {
  try {
    configCloudinary();
    
    // Asegurarse de que podemos leer el cuerpo de la solicitud
    const body = await req.json();
    const { image, folder } = body;
    
    // Verificar que la imagen existe
    if (!image) {
      console.error('No image data provided');
      return NextResponse.json(
        { error: 'Datos de imagen requeridos' },
        { status: 400 }
      );
    }
    
    console.log('Uploading image to folder:', folder || 'gradtrack-projects');
    
    // Configurar opciones de carga
    const uploadOptions = {
      folder: folder || 'gradtrack-projects',
      // Importante: permitir imágenes con datos base64
      resource_type: 'auto'
    };
    
    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(image, uploadOptions);
    console.log('Upload result:', { url: result.secure_url, publicId: result.public_id });
    
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Detailed upload error:', error);
    return NextResponse.json(
      { error: `Error al subir la imagen: ${error.message}` },
      { status: 500 }
    );
  }
}

// El resto del código permanece igual...