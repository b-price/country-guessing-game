// src/components/Score.tsx
import {Button, Card, Row} from "react-bootstrap";
import {useEffect, useState} from "react";
import {RoundScore} from "./Game.tsx";


interface ScoreProps {
    scores: RoundScore[];
    onRestart: () => void;
}


export const Score = ({ scores, onRestart }: ScoreProps) => {
    const [score, setScore] = useState(0);
    const [scoreSaved, setScoreSaved] = useState(false);

    useEffect(() => {
        let correct = 0;
        scores.forEach(s => {
            correct += s.isCorrect ? 1 : 0;
        });
        setScore((correct / scores.length) * 100);
    }, [scores])


    const getScoreIcon = (s: RoundScore) => {
        if (s.isCorrect) {
            return (
                <span className="text-success">{s.guess.name} {s.guess.flagUnicode} <strong>✓</strong></span>
            )
        } else {
            return (
                <span className="text-danger">{s.guess.name} {s.guess.flagUnicode} <strong>✖</strong></span>
            )
        }
    }

    const saveScore = () => {
        // Here you would implement the actual score saving logic
        // For now, we'll just simulate it with a state change
        const scoreData = {
            score: score,
            date: new Date().toISOString(),
            rounds: scores.length,
            correct: scores.filter(s => s.isCorrect).length
        };

        // Save to localStorage as an example
        const savedScores = JSON.parse(localStorage.getItem('countryGameScores') || '[]');
        savedScores.push(scoreData);
        localStorage.setItem('countryGameScores', JSON.stringify(savedScores));

        setScoreSaved(true);
    }


    return (
        <Card>
            <Card.Header>
                <Card.Title className="mt-2">
                    <h3>Score: <span className={score > 80 ? 'text-success' : score > 50 ? 'text-warning' : 'text-danger'}>{score.toFixed(2)}%</span></h3>
                </Card.Title>
            </Card.Header>
            <Card.Body>
                {scores?.map((s, i) => (
                    <Row key={i}>
                        <p><strong>Round {i + 1}: </strong>{s.correct.flagUnicode} {s.correct.name}: {getScoreIcon(s)}</p>
                    </Row>
                ))}
            </Card.Body>
            <Card.Footer>
                <Button className="me-3" variant="primary" onClick={onRestart}>New Game</Button>
                <Button
                    variant="secondary"
                    onClick={saveScore}
                    disabled={scoreSaved}
                >
                    {scoreSaved ? "Score Saved!" : "Save Score"}
                </Button>
            </Card.Footer>
        </Card>
    )
}