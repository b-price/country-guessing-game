import {Button, Card, Dropdown, Row, Col, Badge} from "react-bootstrap";
import {useEffect, useState} from "react";
import {RoundScore} from "./Game.tsx";
import * as htmlToImage from 'html-to-image';

interface ScoreProps {
    scores: RoundScore[];
    onRestart: () => void;
    totalTime: number;
    timedMode?: boolean;
    gameTimeLimit?: number;
}

export const Score = ({ scores, onRestart, totalTime, timedMode = false, gameTimeLimit = 0 }: ScoreProps) => {
    const [score, setScore] = useState(0);

    useEffect(() => {
        let correct = 0;
        scores.forEach(s => {
            correct += s.isCorrect ? 1 : 0;
        });
        setScore((correct / scores.length) * 100);
    }, [scores])

    // Format time to display with one decimal place
    const formatTime = (time: number) => {
        return time.toFixed(1);
    }

    const getScoreIcon = (s: RoundScore) => {
        if (s.isCorrect) {
            return (
                <span className="text-success">{s.guess.name} {s.guess.flagUnicode} <strong>✓</strong></span>
            )
        } else if (s.expired) {
            return (
                <span className="text-secondary">Time Expired <strong>✖</strong></span>
            )
        } else if (s.skipped) {
            return (
                <span className="text-secondary">Skipped <strong>✖</strong></span>
            )
        } else {
            return (
                <span className="text-danger">{s.guess.name} {s.guess.flagUnicode} <strong>✖</strong></span>
            )
        }
    }

    const saveJSON = () => {
        const scoreData = {
            totalScore: score.toFixed(2),
            totalTime: formatTime(totalTime),
            timedMode: timedMode,
            gameTimeLimit: timedMode ? formatTime(gameTimeLimit) : null,
            rounds: scores.map(s => ({
                guess: s.guess.name,
                correct: s.correct.name,
                isCorrect: s.isCorrect,
                skipped: s.skipped,
                expired: s.expired,
                timeElapsed: formatTime(s.timeElapsed)
            }))
        };
        const json = JSON.stringify(scoreData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `game_score_${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const saveImage = () => {
        htmlToImage
            .toPng(document.getElementById('imageArea') as HTMLElement, {backgroundColor: '#FFF'})
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `game_score_${new Date().toISOString()}.png`;
                link.href = dataUrl;
                link.click();
                URL.revokeObjectURL(dataUrl);
            });
    }

    const saveText = () => {
        let text =
            `### Country Guessing Game Results ###
*** Final Score: ${score.toFixed(2)}% ***
*** Total Time: ${formatTime(totalTime)}s ***
${timedMode ? `*** Timed Mode Active (Limit: ${formatTime(gameTimeLimit)}s) ***` : ''}
`;
        scores.forEach(((score, i) => {
            const status = score.isCorrect ? "✓" : "✖";
            let guessText = score.guess.name;

            if (score.expired) {
                guessText = "Time Expired";
            } else if (score.skipped) {
                guessText = "Skipped";
            }

            text += `Round ${i + 1}: Answer: ${score.correct.name} Guess: ${guessText} ${status} Time: ${formatTime(score.timeElapsed)}s
`;
        }));
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `game_score_${new Date().toISOString()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Card>
            <div id="imageArea">
                <Card.Header>
                    <Card.Title className="mt-2">
                        <h3>Score: <span className={score > 80 ? 'text-success' : score > 50 ? 'text-warning' : 'text-danger'}>{score.toFixed(2)}%</span></h3>
                        <h5>
                            {timedMode ? (
                                <>Game Mode: <Badge bg="danger">Timed</Badge></>
                            ) : (
                                <>Game Mode: <Badge bg="primary">Standard</Badge></>
                            )}
                        </h5>
                        <h5>
                            Total Time: {timedMode ? (
                                <Badge bg="success">{formatTime(totalTime)}s / {formatTime(gameTimeLimit)}s</Badge>
                            ) : (
                            <Badge bg="success">{formatTime(totalTime)}s</Badge>
                        )}
                        </h5>
                    </Card.Title>
                </Card.Header>
                <Card.Body>
                    {scores?.map((s, i) => (
                        <Row key={i}>
                            <Col>
                                <p><strong>Round {i + 1}: </strong>{s.correct.flagUnicode} {s.correct.name}: {getScoreIcon(s)}</p>
                            </Col>
                            <Col xs="auto">
                                {timedMode ? (
                                    <Badge bg="secondary">{formatTime(s.timeElapsed)}s / {formatTime(s.timeAllowed)}s</Badge>
                                ) : (
                                    <Badge bg="secondary">{formatTime(s.timeElapsed)}s</Badge>
                                )}
                            </Col>
                        </Row>
                    ))}
                </Card.Body>
            </div>

            <Card.Footer className="d-flex align-items-center">
                <Button className="me-3" variant="primary" onClick={onRestart}>+ New Game</Button>
                <Dropdown>
                    <Dropdown.Toggle variant="secondary">
                        ↓ Save Score
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={saveImage}>As Image</Dropdown.Item>
                        <Dropdown.Item onClick={saveText}>As Text</Dropdown.Item>
                        <Dropdown.Item onClick={saveJSON}>As JSON</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </Card.Footer>
        </Card>
    )
}