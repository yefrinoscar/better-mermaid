import { MermaidDashboard } from '@/components/mermaid-dashboard'
import { ThemeProvider } from '@/components/theme-provider'

export default function Page() {
  return (
    <ThemeProvider>
      <MermaidDashboard />
    </ThemeProvider>
  )
}
