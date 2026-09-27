import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import axios from 'axios'

vi.mock('axios')
vi.mock('react-plotly.js', () => ({
  default: () => <div>Mocked Plotly</div>
}))

describe('Dashboard Component', () => {
  it('renders without crashing', async () => {
    axios.get.mockResolvedValue({
      data: {
        total_packets: 1000,
        normal_traffic: 900,
        detected_attacks: 100,
        zero_day_attacks: 10,
        high_risk_alerts: 5,
        threat_level: 'MEDIUM',
        attack_distribution: {}
      }
    })
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )
    
    expect(await screen.findByText(/Security Dashboard/i)).toBeInTheDocument()
  })
})
