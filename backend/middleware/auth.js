import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

      req.user = await User.findById(decoded.id).select('-password')
      next()
    } catch (error) {
      console.error('Auth error:', error)
      return res.status(401).json({ message: 'No autorizado, token inválido' })
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, sin token' })
  }
}

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  })
}
