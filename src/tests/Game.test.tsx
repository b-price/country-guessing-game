// Game.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('../components/Map', () => ({
    __esModule: true, // for ES6 module compatibility
    default: ({ onSelection }: { onSelection: (countryName: string) => void }) => (
        <div onClick={() => onSelection('Not A Country')}>MockMap</div>
    ),
}));
import { Game } from '../components/Game';


describe('Game Component', () => {

    test('renders the game start form', () => {
        render(<Game />);
        expect(screen.getByText('Country Guessing Game')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount of Countries')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter Out Top')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter Out Bottom')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start Game' })).toBeInTheDocument();
    });

    test('starts the game with valid input', async () => {

        render(<Game />);
        fireEvent.change(screen.getByLabelText('Amount of Countries'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Filter Out Top'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Filter Out Bottom'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

        await waitFor(() => {
            expect(screen.getByText('Round 1/5')).toBeInTheDocument();
        });
    });

    test('shows error for invalid country count', () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Amount of Countries'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
        expect(screen.getByText('Error: Enter a valid country amount (1-195).')).toBeInTheDocument();
    });

    test('shows error for invalid top filter percentage', () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Filter Out Top'), { target: { value: '101' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
        expect(screen.getByText('Error: Enter a valid top filter percentage (0-100).')).toBeInTheDocument();
    });

    test('shows error for invalid bottom filter percentage', () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Filter Out Bottom'), { target: { value: '-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
        expect(screen.getByText('Error: Enter a valid bottom filter percentage (0-100).')).toBeInTheDocument();
    });

    test('restarts the game', async () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Amount of Countries'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Filter Out Top'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Filter Out Bottom'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

        await waitFor(() => {
            expect(screen.getByText('Round 1/1')).toBeInTheDocument();
        });

        // Simulate map selection by clicking the mocked map
        fireEvent.click(screen.getByText('MockMap'));

        await waitFor(() => {
            expect(screen.getByText('Score:')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'New Game' }));

        await waitFor(() => {
            expect(screen.getByText('Country Guessing Game')).toBeInTheDocument();
            expect(screen.getByLabelText('Amount of Countries')).toBeInTheDocument();
        });
    });

    test('handles map selection and progresses rounds', async () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Amount of Countries'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Filter Out Top'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Filter Out Bottom'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

        await waitFor(() => {
            expect(screen.getByText('Round 1/5')).toBeInTheDocument();
        });

        // Simulate map selection by clicking the mocked map
        fireEvent.click(screen.getByText('MockMap'));

        await waitFor(() => {
            expect(screen.getByText('Round 2/5')).toBeInTheDocument();
        });
    });

    test('shows game over screen after all rounds', async () => {
        render(<Game />);
        fireEvent.change(screen.getByLabelText('Amount of Countries'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Filter Out Top'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Filter Out Bottom'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));

        await waitFor(() => {
            expect(screen.getByText('Round 1/1')).toBeInTheDocument();
        });

        // Simulate map selection by clicking the mocked map
        fireEvent.click(screen.getByText('MockMap'));

        await waitFor(() => {
            expect(screen.getByText('Score:')).toBeInTheDocument();
        });
    });
});