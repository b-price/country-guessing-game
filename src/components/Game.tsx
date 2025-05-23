import {useState, useEffect, useRef} from "react";
import {Alert, Badge, Button, Card, Col, Container, Form, InputGroup, Row} from "react-bootstrap";
import MapChart from "./Map.tsx";
import {Score} from "./Score.tsx";
import countryData from '../data/countries.json' with { type: 'json' };
import ContinentSelectionMap from "./ContinentSelectionMap.tsx";

export interface Country {
    name: string;
    popRank: number;
    continent: string;
    flagUnicode: string;
}

export interface RoundScore {
    guess: Country;
    correct: Country;
    isCorrect: boolean;
    timeElapsed: number;
    skipped: boolean;
    expired: boolean; // Add this
    timeLimit?: number; // Optional: store the time limit for this round
}

interface ContinentSelectionMap {
    northAmerica: 'North America',
    southAmerica: 'South America',
    asia: 'Asia',
    oceania: 'Oceania',
    africa: 'Africa',
    europe: 'Europe'
}

export const Game = () => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [currentCountry, setCurrentCountry] = useState<Country>(countryData[0]);
    const [scores, setScores] = useState<RoundScore[]>([]);
    const [popTopPercent, setPopTopPercent] = useState(0);
    const [popBottomPercent, setPopBottomPercent] = useState(0);
    const [countryCount, setCountryCount] = useState<number>(countryData.length);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [gameActive, setGameActive] = useState<boolean>(false);
    const [error, setError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [round, setRound] = useState<number>(0);
    const [selectedContinents, setSelectedContinents] = useState<Set<string>>(new Set());
    const [allContinents, setAllContinents] = useState<string[]>([])
    const [roundTime, setRoundTime] = useState<number>(0);
    const [totalTime, setTotalTime] = useState<number>(0);
    const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
    const [roundTimeRemaining, setRoundTimeRemaining] = useState<number>(0);
    const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(0);
    const [countryTimeLimits, setCountryTimeLimits] = useState<number[]>([]);
    const roundTimerRef = useRef<number | null>(null);
    const totalTimerRef = useRef<number | null>(null);

    // Get unique continents on component mount
    useEffect(() => {
        const uniqueContinents = [...new Set(countryData.map(c => c.continent))];
        const formattedContinents = uniqueContinents.map(continent => getContinentString(continent as keyof ContinentSelectionMap));
        setAllContinents(formattedContinents);
        setSelectedContinents(new Set(formattedContinents));
    }, []);

    // Modified timer effect for countdown in timed mode
    useEffect(() => {
        if (gameActive && isTimedMode) {
            // Round timer (countdown)
            if (roundTimeRemaining > 0) {
                roundTimerRef.current = window.setInterval(() => {
                    setRoundTimeRemaining(prev => {
                        if (prev <= 0.1) {
                            // Round time expired
                            handleRoundTimeExpired();
                            return 0;
                        }
                        return prev - 0.1;
                    });
                }, 100);
            }

            // Total game timer (countdown)
            if (totalTimeRemaining > 0 && totalTimerRef.current === null) {
                totalTimerRef.current = window.setInterval(() => {
                    setTotalTimeRemaining(prev => {
                        if (prev <= 0.1) {
                            // Game time expired
                            handleGameTimeExpired();
                            return 0;
                        }
                        return prev - 0.1;
                    });
                }, 100);
            }
        } else if (gameActive && !isTimedMode) {
            // Original count-up timers for normal mode
            setRoundTime(0);
            roundTimerRef.current = window.setInterval(() => {
                setRoundTime(prev => prev + 0.1);
            }, 100);

            if (totalTimerRef.current === null) {
                setTotalTime(0);
                totalTimerRef.current = window.setInterval(() => {
                    setTotalTime(prev => prev + 0.1);
                }, 100);
            }
        } else {
            // Clear timers when game is not active
            if (roundTimerRef.current) {
                clearInterval(roundTimerRef.current);
                roundTimerRef.current = null;
            }
            if (totalTimerRef.current) {
                clearInterval(totalTimerRef.current);
                totalTimerRef.current = null;
            }
        }

        return () => {
            if (roundTimerRef.current) clearInterval(roundTimerRef.current);
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        };
    }, [gameActive, isTimedMode, roundTimeRemaining, totalTimeRemaining]);

    // Calculate time limit based on population rank
    const calculateRoundTimeLimit = (popRank: number, totalCountries: number): number => {
        // Linear interpolation between 10s (most populous) and 45s (least populous)
        if (totalCountries <= 1) return 45;
        const minTime = 10;
        const maxTime = 45;
        // Normalize popRank to 0-1 scale (0 = most populous, 1 = least populous)
        const normalizedRank = (popRank - 1) / (totalCountries - 1);
        return Math.round(minTime + (maxTime - minTime) * normalizedRank);
    };

    function getRandomUniqueIntegers(x: number, min: number, max: number) {
        if (min > max || x <= 0) return [];

        const rangeSize = max - min + 1;
        const count = Math.min(x, rangeSize);
        const available = [];

        for (let i = min; i <= max; i++) {
            available.push(i);
        }

        // Fisher-Yates shuffle to pick random unique items
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }

        return available.slice(0, count);
    }

    // Maps 'countries.json' format string to 'world-continents.topo.json' format
    const getContinentString = (continent: keyof ContinentSelectionMap) => {
        const continentStringMap = {
            northAmerica: 'North America',
            southAmerica: 'South America',
            asia: 'Asia',
            oceania: 'Oceania',
            africa: 'Africa',
            europe: 'Europe',
            default: "None"
        }

        return continentStringMap[continent] || continentStringMap.default;
    }

    // Modified onGameStart to handle both normal and timed modes
    const onGameStart = (timed: boolean = false) => {
        const success = calculateCountries();
        if (success) {
            setIsTimedMode(timed);
            setGameActive(true);
            setGameOver(false);

            if (timed) {
                // Calculate time limits for each country
                const timeLimits = countries.map(country =>
                    calculateRoundTimeLimit(country.popRank, countryData.length)
                );
                setCountryTimeLimits(timeLimits);

                // Set initial round time
                setRoundTimeRemaining(timeLimits[0]);

                // Calculate total game time (90% of sum of round times)
                const totalGameTime = timeLimits.reduce((sum, time) => sum + time, 0) * 0.9;
                setTotalTimeRemaining(totalGameTime);
            } else {
                // Reset for normal mode
                setRoundTimeRemaining(0);
                setTotalTimeRemaining(0);
                setCountryTimeLimits([]);
                setTotalTime(0);
                setRoundTime(0);
            }
        }
    };


    // Function to toggle continent selection
    const toggleContinent = (continent: string) => {
        const newSelected = new Set(selectedContinents);
        if (newSelected.has(continent)) {
            newSelected.delete(continent);
        } else {
            newSelected.add(continent);
        }
        setSelectedContinents(newSelected);
    };

    const calculateCountries = () => {
        if (popTopPercent < 0 || popTopPercent > 100 || isNaN(popTopPercent)) {
            setError(true);
            setErrorMessage('Error: Enter a valid top filter percentage (0-100).')
            return false;
        }
        if (popBottomPercent < 0 || popBottomPercent > 100 || isNaN(popBottomPercent)) {
            setError(true);
            setErrorMessage('Error: Enter a valid bottom filter percentage (0-100).')
            return false;
        }
        let filteredCountries = [...countryData];
        if (countryCount < 1 || countryCount > filteredCountries.length || isNaN(countryCount)) {
            setError(true);
            setErrorMessage(`Error: Enter a valid country amount (1-${filteredCountries.length}).`)
            return false;
        }
        if (popTopPercent !== 0) {
            filteredCountries = filteredCountries.filter((country) => {
                return country.popRank / filteredCountries.length > popTopPercent / 100;
            })
        }
        if (popBottomPercent !== 0) {
            filteredCountries = filteredCountries.filter((country) => {
                return country.popRank / filteredCountries.length < (100 - popBottomPercent) / 100;
            })
        }
        filteredCountries = filteredCountries.filter(country =>
            selectedContinents.has(getContinentString(country.continent as keyof ContinentSelectionMap))
        );

        const indexes: number[] = getRandomUniqueIntegers(countryCount, 0, filteredCountries.length - 1);
        if (indexes.length > 0) {
            const newCountries: Country[] = [];
            indexes.forEach((i) => newCountries.push(filteredCountries[i]));
            if (indexes.length !== countryCount) {
                setCountryCount(indexes.length);
            }

            setCountries(newCountries);
            setCurrentCountry(newCountries[0]);
            setError(false);
            setErrorMessage('');
            return true;
        }
        setError(true);
        setErrorMessage('Error: Filters too narrow for amount of countries.')
        return false;
    }

    const onGameRestart = () => {
        setScores([]);
        setRound(0);
        setCountries([]);
        setGameActive(false);
        setGameOver(false);
        setGameActive(false);
        setGameOver(false);
        setTotalTime(0);
        setRoundTime(0);
    }

    // Handle round time expiration
    const handleRoundTimeExpired = () => {
        // Mark current round as expired
        setScores([...scores, {
            guess: currentCountry,
            correct: currentCountry,
            isCorrect: false,
            timeElapsed: countryTimeLimits[round],
            skipped: false,
            expired: true,
            timeLimit: countryTimeLimits[round]
        }]);

        // Move to next round or end game
        const nextRound = round + 1;
        if (nextRound >= countries.length) {
            setGameActive(false);
            setGameOver(true);
        } else {
            setCurrentCountry(countries[nextRound]);
            setRound(nextRound);
            setRoundTimeRemaining(countryTimeLimits[nextRound]);
        }
    };

    // Handle game time expiration
    const handleGameTimeExpired = () => {
        // Mark current and all remaining rounds as expired
        const remainingScores: RoundScore[] = [];
        for (let i = round; i < countries.length; i++) {
            remainingScores.push({
                guess: countries[i],
                correct: countries[i],
                isCorrect: false,
                timeElapsed: i === round ? countryTimeLimits[i] - roundTimeRemaining : countryTimeLimits[i],
                skipped: false,
                expired: true,
                timeLimit: countryTimeLimits[i]
            });
        }

        setScores([...scores, ...remainingScores]);
        setGameActive(false);
        setGameOver(true);
    };

    // Modified onMapSelection to handle timed mode
    const onMapSelection = (countryName: string) => {
        const guess = countryData.find(s => s.name === countryName);
        if (guess) {
            const timeUsed = isTimedMode
                ? countryTimeLimits[round] - roundTimeRemaining
                : roundTime;

            setScores([...scores, {
                guess,
                correct: currentCountry,
                isCorrect: countryName === currentCountry.name,
                timeElapsed: timeUsed,
                skipped: false,
                expired: false,
                timeLimit: isTimedMode ? countryTimeLimits[round] : undefined
            }]);

            const nextRound = round + 1;
            if (nextRound >= countries.length) {
                setGameActive(false);
                setGameOver(true);
            } else {
                setCurrentCountry(countries[nextRound]);
                setRound(nextRound);
                if (isTimedMode) {
                    setRoundTimeRemaining(countryTimeLimits[nextRound]);
                } else {
                    setRoundTime(0);
                }
            }
        }
    };


    // Format time to display with one decimal place
    const formatTime = (time: number) => {
        return time.toFixed(1);
    }

    // New function to handle skipping a round
    // Modified skipRound to handle timed mode
    const skipRound = () => {
        const timeUsed = isTimedMode
            ? countryTimeLimits[round] - roundTimeRemaining
            : roundTime;

        setScores([...scores, {
            guess: currentCountry,
            correct: currentCountry,
            isCorrect: false,
            timeElapsed: timeUsed,
            skipped: true,
            expired: false,
            timeLimit: isTimedMode ? countryTimeLimits[round] : undefined
        }]);

        const nextRound = round + 1;
        if (nextRound >= countries.length) {
            setGameActive(false);
            setGameOver(true);
        } else {
            setCurrentCountry(countries[nextRound]);
            setRound(nextRound);
            if (isTimedMode) {
                setRoundTimeRemaining(countryTimeLimits[nextRound]);
            } else {
                setRoundTime(0);
            }
        }
    };

    // Modified quitGame to handle timed mode
    const quitGame = () => {
        const remainingScores: RoundScore[] = [];
        for (let i = round; i < countries.length; i++) {
            const timeUsed = i === round
                ? (isTimedMode ? countryTimeLimits[i] - roundTimeRemaining : roundTime)
                : 0;

            remainingScores.push({
                guess: countries[i],
                correct: countries[i],
                isCorrect: false,
                timeElapsed: timeUsed,
                skipped: true,
                expired: false,
                timeLimit: isTimedMode ? countryTimeLimits[i] : undefined
            });
        }

        setScores([...scores, ...remainingScores]);
        setGameActive(false);
        setGameOver(true);
    };

    return (
        <Container>
            <Row className="my-4"><h2>Country Guessing Game</h2></Row>
            {!gameActive && !gameOver && (
                <Form>
                    <Row>
                        <Col>
                            <Form.Group controlId="amountOfCountries">
                                <Form.Label>Amount of Countries</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={countryCount}
                                    onChange={(e) => setCountryCount(parseInt(e.target.value))}
                                />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group controlId="filterOutTop">
                                <Form.Label>Filter Out Top</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        value={popTopPercent}
                                        onChange={(e) => setPopTopPercent(parseFloat(e.target.value))}
                                    />
                                    <InputGroup.Text>%</InputGroup.Text>
                                </InputGroup>
                                <Form.Label>of Countries by Population</Form.Label>
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group controlId="filterOutBottom">
                                <Form.Label>Filter Out Bottom</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        value={popBottomPercent}
                                        onChange={(e) => setPopBottomPercent(parseFloat(e.target.value))}
                                    />
                                    <InputGroup.Text>%</InputGroup.Text>
                                </InputGroup>
                                <Form.Label>of Countries by Population</Form.Label>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="my-3">
                        <Col>
                            <Card>
                                <Form.Group controlId="continentFilter">
                                    <Card.Header>
                                        <Form.Label className="mb-0">Filter by Continent</Form.Label>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col xs="auto">
                                                <div className="mt-2">
                                                    <strong>Selected continents: </strong>
                                                    <div className="my-2">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="me-3"
                                                            onClick={() => setSelectedContinents(new Set(allContinents))}
                                                        >
                                                            All
                                                        </Button>
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => setSelectedContinents(new Set([]))}
                                                        >
                                                            None
                                                        </Button>
                                                    </div>

                                                    {selectedContinents.size === allContinents.length
                                                        ? <div>All</div>
                                                        : (
                                                            Array.from(selectedContinents).map((c, i) =>
                                                                <div key={i}>{c}</div>
                                                            )
                                                        )}
                                                </div>
                                            </Col>
                                            <Col xs={11} md={7}>
                                                <div className="p-0">
                                                    <ContinentSelectionMap
                                                        selectedContinents={selectedContinents}
                                                        onContinentToggle={toggleContinent}
                                                    />
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Form.Group>
                            </Card>
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-between">
                        <Button variant="primary" size="lg" onClick={() => onGameStart(false)}>
                            Start Game
                        </Button>
                        <Button variant="info" size="lg" onClick={() => onGameStart(true)}>
                            Timed Mode
                        </Button>
                    </div>
                </Form>
            )}
            {gameActive && (
                <>
                    <Card className="mb-3">
                        <Card.Header className="d-flex align-items-center justify-content-between pb-0">
                            <h3>{currentCountry?.name} {currentCountry.flagUnicode}</h3>
                            <h5 className="d-none d-md-block">
                                <Badge bg="secondary">
                                    Round: {isTimedMode
                                    ? `${formatTime(roundTimeRemaining)}s remaining`
                                    : `${formatTime(roundTime)}s`}
                                </Badge>
                            </h5>
                            <h4 id="roundDisplay" className="me-md-3">Round {round + 1}/{countryCount}</h4>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <MapChart onSelection={onMapSelection}/>
                        </Card.Body>
                        <Card.Footer className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <Badge bg="success">
                                    {isTimedMode
                                        ? `Time Left: ${formatTime(totalTimeRemaining)}s`
                                        : `Total Time: ${formatTime(totalTime)}s`}
                                </Badge>
                            </h5>
                            <h5 className="d-block d-md-none mb-0">
                                <Badge bg="secondary">
                                    Round: {isTimedMode
                                    ? `${formatTime(roundTimeRemaining)}s left`
                                    : `${formatTime(roundTime)}s`}
                                </Badge>
                            </h5>

                            <div className="d-none d-md-block">
                                <Button variant="secondary" className="me-2" onClick={skipRound}>
                                    Skip Round
                                </Button>
                                <Button variant="danger" onClick={quitGame}>
                                    Quit Game
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                    <div className="d-flex d-md-none justify-content-evenly">
                        <Button variant="outline-secondary" className="me-2" onClick={skipRound}>
                            Skip Round
                        </Button>
                        <Button variant="outline-danger" onClick={quitGame}>
                            Quit Game
                        </Button>
                    </div>
                </>

            )}
            {!gameActive && gameOver && (
                <Score scores={scores} onRestart={onGameRestart} totalTime={totalTime}/>
            )}
            <Alert className="mt-3" variant="danger" show={error}>{errorMessage}</Alert>
        </Container>
    )
}