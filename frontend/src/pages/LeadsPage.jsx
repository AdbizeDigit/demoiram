import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Loader2, RefreshCw, Search, Globe } from 'lucide-react'
import api from '../services/api'
import LeadsTab from '../components/detection/LeadsTab'

export default function LeadsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Leads
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Todos los leads detectados por el sistema de scraping</p>
        </div>
      </div>
      <LeadsTab />
    </div>
  )
}
