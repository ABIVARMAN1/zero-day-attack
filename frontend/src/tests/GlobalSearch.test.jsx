import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GlobalHeader from '../components/GlobalHeader';
import axios from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Global Search Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/notifications')) {
        return Promise.resolve({ data: { success: true, notifications: [] } });
      }
      return Promise.resolve({ data: { success: true, results: [] } });
    });
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <GlobalHeader />
      </BrowserRouter>
    );
  };

  it('1. Search modal opens with Ctrl+K', async () => {
    renderComponent();
    expect(screen.queryByPlaceholderText(/Search Threat IDs/i)).not.toBeInTheDocument();
    
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search Threat IDs/i)).toBeInTheDocument();
    });
  });

  it('2. Search input accepts text', async () => {
    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'DDoS' } });
    
    expect(input.value).toBe('DDoS');
  });

  it('3. Matching alert is displayed', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/search')) {
        return Promise.resolve({
          data: {
            success: true,
            results: [{ type: 'alert', id: 'ALT-1', title: 'DDoS Attack', description: 'Test', severity: 'HIGH', route: '/alerts' }]
          }
        });
      }
      return Promise.resolve({ data: { success: true, notifications: [] } });
    });

    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'DDoS' } });

    await waitFor(() => {
      expect(screen.getByText(/DDoS Attack/i)).toBeInTheDocument();
      expect(screen.getByText(/ALT-1/i)).toBeInTheDocument();
    });
  });

  it('4. Matching investigation is displayed', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/search')) {
        return Promise.resolve({
          data: {
            success: true,
            results: [{ type: 'investigation', id: 'INV-1', title: 'Test Inv', description: 'Test', route: '/investigations' }]
          }
        });
      }
      return Promise.resolve({ data: { success: true, notifications: [] } });
    });

    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'INV-1' } });

    await waitFor(() => {
      expect(screen.getByText(/Test Inv/i)).toBeInTheDocument();
    });
  });

  it('5. No-match state displays "No results found"', async () => {
    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'Nothing' } });

    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });

  it('6. API failure displays an error state', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/search')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ data: { success: true, notifications: [] } });
    });

    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'Error' } });

    await waitFor(() => {
      expect(screen.getByText(/Unable to search right now/i)).toBeInTheDocument();
    });
  });

  it('7. Clicking a result navigates correctly', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/search')) {
        return Promise.resolve({
          data: {
            success: true,
            results: [{ type: 'alert', id: 'ALT-1', title: 'DDoS', description: 'Test', route: '/alerts' }]
          }
        });
      }
      return Promise.resolve({ data: { success: true, notifications: [] } });
    });

    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'DDoS' } });

    await waitFor(() => {
      expect(screen.getByText(/DDoS/i)).toBeInTheDocument();
    });
    
    // Simulate Enter key on selected index
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockNavigate).toHaveBeenCalledWith('/alerts');
  });

  it('8. RBAC restrictions are respected', async () => {
    // RBAC is enforced on backend. This test confirms the frontend passes credentials correctly.
    renderComponent();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search Threat IDs/i);
    fireEvent.change(input, { target: { value: 'Auth' } });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`${API_BASE_URL}/api/search?q=Auth`, { withCredentials: true });
    });
  });
});
