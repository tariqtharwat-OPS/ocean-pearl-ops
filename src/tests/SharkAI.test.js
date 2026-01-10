import { fireEvent, render, screen } from '@testing-library/react';
import SharkChat from '../components/SharkChat';

describe('Shark AI Identity Verification', () => {
  it('should not refer to itself as Samudra', async () => {
    render(<SharkChat />);
    
    // Simulate a user message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Who are you?' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for the AI's response
    const response = await screen.findByText(/Shark AI/i);

    // Assert that the response does not contain the word "Samudra"
    expect(response).not.toHaveTextContent(/Samudra/i);
  });
});
  
  it('should identify itself as Shark AI', async () => {
    render(<SharkChat />);
    
    // Simulate a user message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'What is your name?' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for the AI's response
    const response = await screen.findByText(/My name is Shark AI/i);

    // Assert that the response contains the words "Shark AI"
    expect(response).toBeInTheDocument();
  });
});
