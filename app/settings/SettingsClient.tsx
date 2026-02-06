'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Info, AlertCircle } from 'lucide-react'

interface ProviderConfig {
  provider: 'anthropic' | 'groq'
  configured: boolean
  hasAnthropicKey: boolean
  hasGroqKey: boolean
}

export default function SettingsClient() {
  const [config, setConfig] = useState<ProviderConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviderConfig()
  }, [])

  const fetchProviderConfig = async () => {
    try {
      const response = await fetch('/api/config/provider')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Failed to fetch provider config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderToggle = async (checked: boolean) => {
    const newProvider = checked ? 'anthropic' : 'groq'
    
    try {
      const response = await fetch('/api/config/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to update provider: ${errorData.error || 'Please try again.'}`)
      }
    } catch (error) {
      console.error('Failed to update provider:', error)
      alert('Failed to update provider. Please try again.')
    }
  }

  const currentProvider = config?.provider || 'groq'
  const isConfigured = config?.configured || false

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">API configuration and system settings</p>
        </div>

        {/* API Provider Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              API Provider (Pembangunan)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-4 text-slate-500">Memuatkan...</div>
            ) : (
              <>
                {/* Current Provider Status with Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Provider Semasa</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {currentProvider === 'anthropic' 
                        ? 'Anthropic Claude' 
                        : 'Groq (Llama 3.1)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label 
                        htmlFor="provider-toggle" 
                        className="text-sm cursor-pointer"
                        onClick={() => !config?.hasAnthropicKey && !config?.hasGroqKey ? null : handleProviderToggle(false)}
                      >
                        Groq
                      </Label>
                      <Switch
                        id="provider-toggle"
                        checked={currentProvider === 'anthropic'}
                        onCheckedChange={handleProviderToggle}
                        disabled={(!config?.hasAnthropicKey && currentProvider === 'anthropic') || 
                                 (!config?.hasGroqKey && currentProvider === 'groq')}
                      />
                      <Label 
                        htmlFor="provider-toggle" 
                        className="text-sm cursor-pointer"
                        onClick={() => !config?.hasAnthropicKey && !config?.hasGroqKey ? null : handleProviderToggle(true)}
                      >
                        Anthropic
                      </Label>
                    </div>
                    <Badge 
                      variant={isConfigured ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {isConfigured ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Dikonfigurasi
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Tidak Dikonfigurasi
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                {/* API Key Status */}
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">Status API Keys</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">Anthropic</span>
                      {config?.hasAnthropicKey ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">Groq</span>
                      {config?.hasGroqKey ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-blue-900">Cara Menukar Provider</p>
                      <p className="text-sm text-blue-800">
                        Use the toggle above to switch providers instantly (no server restart needed).
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Note:</strong> Groq is free and fast. Anthropic requires API credits (minimum $5).
                        This toggle will save your preference in the file <code className="bg-blue-100 px-1 rounded">.api-config.json</code>.
                      </p>
                      <details className="mt-2">
                        <summary className="text-xs text-blue-700 cursor-pointer hover:text-blue-900">
                          Alternatif: Tukar melalui .env.local (perlu restart)
                        </summary>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800 mt-2 ml-4">
                          <li>Open file <code className="bg-blue-100 px-1 rounded">.env.local</code> in the project root</li>
                          <li>Add: <code className="bg-blue-100 px-1 rounded">PARSE_ORDER_PROVIDER=groq</code> or <code className="bg-blue-100 px-1 rounded">PARSE_ORDER_PROVIDER=anthropic</code></li>
                          <li>Restart server (<code className="bg-blue-100 px-1 rounded">npm run dev</code>)</li>
                        </ol>
                      </details>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Environment File Location */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration File Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-slate-900 text-green-400 rounded-lg font-mono text-sm">
              .env.local
            </div>
            <p className="text-sm text-slate-500 mt-2">
              This file is located in the project root (next to package.json)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
