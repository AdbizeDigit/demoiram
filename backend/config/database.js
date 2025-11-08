import mongoose from 'mongoose'

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adbize-demos', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`)
    // En modo desarrollo, continuar sin DB
    console.log('⚠️  Continuando sin conexión a base de datos (modo desarrollo)')
  }
}
