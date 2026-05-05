import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

      // Buscar usuario y excluir la contraseña
      const user = await User.findById(decoded.id)
      if (!user) {
        return res.status(401).json({ message: 'Usuario no encontrado' })
      }

      // Eliminar la contraseña antes de asignar al request
      delete user.password
      req.user = user
      next()
    } catch (error) {
      console.error('Auth error:', error)
      return res.status(401).json({ message: 'No autorizado, token inválido' })
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, sin token' })
  }
}

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  })
}

// Middleware para verificar rol de admin
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Solo administradores pueden acceder a esta sección.' })
  }

  next()
}

// Permite acceso a admin O vendedor (seller). Útil para todo el flujo de prospección
// que el vendedor necesita: leads, pipeline, outreach, métricas, etc.
export const sellerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' })
  }
  if (req.user.role !== 'admin' && req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Acceso denegado. Solo vendedores o administradores.' })
  }
  next()
}

// Solo vendedor (no admin) - útil para acciones que solo deben ser de un vendedor
export const sellerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' })
  }
  if (req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Acceso restringido a vendedores' })
  }
  next()
}

// Middleware para verificar límites de uso de servicios
export const checkServiceLimit = (serviceName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id
      const canUse = await User.canUseService(userId, serviceName)

      if (!canUse) {
        return res.status(403).json({
          message: `Has alcanzado el límite de usos para este servicio. Contacta con soporte para obtener más usos.`,
          service: serviceName,
          remainingUses: 0
        })
      }

      // Decrementar el uso del servicio
      await User.decrementServiceUse(userId, serviceName)

      // Obtener usos restantes
      const usage = await User.getServiceUsage(userId)
      const columnName = `${serviceName}_uses`
      req.remainingUses = usage[columnName]

      next()
    } catch (error) {
      console.error('Service limit check error:', error)
      return res.status(500).json({ message: 'Error al verificar límites de servicio' })
    }
  }
}
