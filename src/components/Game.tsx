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
    expired: boolean;
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
    const [timedMode, setTimedMode] = useState<boolean>(false);
    const [roundTimeLimit, setRoundTimeLimit] = useState<number>(0);
    const [gameTimeLimit, setGameTimeLimit] = useState<number>(0);
    const [roundTimeRemaining, setRoundTimeRemaining] = useState<number>(0);
    const [gameTimeRemaining, setGameTimeRemaining] = useState<number>(0);
    const roundTimerRef = useRef<number | null>(null);
    const totalTimerRef = useRef<number | null>(null);

    // Get unique continents on component mount
    useEffect(() => {
        const uniqueContinents = [...new Set(countryData.map(c => c.continent))];
        const formattedContinents = uniqueContinents.map(continent => getContinentString(continent as keyof ContinentSelectionMap));
        setAllContinents(formattedContinents);
        setSelectedContinents(new Set(formattedContinents));
    }, []);

    // Start timers when game becomes active
    useEffect(() => {
        if (gameActive) {
            if (timedMode) {
                // Start countdown timers for timed mode
                setRoundTimeRemaining(calculateRoundTimeLimit(currentCountry.popRank));

                roundTimerRef.current = window.setInterval(() => {
                    setRoundTimeRemaining(prev => {
                        const newTime = Math.max(0, prev - 0.1);
                        if (newTime <= 0) {
                            // Time's up for this round
                            handleExpiredRound();
                        }
                        return newTime;
                    });
                }, 100);

                // Start game timer if it's not already running
                if (totalTimerRef.current === null) {
                    setGameTimeRemaining(gameTimeLimit);
                    totalTimerRef.current = window.setInterval(() => {
                        setGameTimeRemaining(prev => {
                            const newTime = Math.max(0, prev - 0.1);
                            if (newTime <= 0) {
                                // Game time's up
                                handleExpiredGame();
                            }
                            return newTime;
                        });
                    }, 100);
                }
            } else {
                // Original mode with counting up timers
                setRoundTime(0);
                roundTimerRef.current = window.setInterval(() => {
                    setRoundTime(prev => prev + 0.1);
                }, 100);

                // Start total timer if it's not already running
                if (totalTimerRef.current === null) {
                    setTotalTime(0);
                    totalTimerRef.current = window.setInterval(() => {
                        setTotalTime(prev => prev + 0.1);
                    }, 100);
                }
            }
        } else {
            // Clear round timer when game is not active
            if (roundTimerRef.current) {
                clearInterval(roundTimerRef.current);
                roundTimerRef.current = null;
            }

            // Clear total timer when game is over
            if (gameOver && totalTimerRef.current) {
                clearInterval(totalTimerRef.current);
                totalTimerRef.current = null;
            }
        }

        // Cleanup timers on component unmount
        return () => {
            if (roundTimerRef.current) clearInterval(roundTimerRef.current);
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        };
    }, [gameActive, gameOver, currentCountry, timedMode]);


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

    // Calculate time limit for a round based on population rank
    const calculateRoundTimeLimit = (popRank: number) => {
        // Get the total number of countries for scaling
        const totalCountries = countryData.length;

        // Scale from 10 seconds (most populous) to 45 seconds (least populous)
        // popRank is 1-based (1 = most populous)
        const timeLimit = 10 + (popRank - 1) * (35 / (totalCountries - 1));
        return Math.round(timeLimit * 10) / 10; // Round to 1 decimal place
    };

    // Calculate total game time limit (90% of sum of all round times)
    const calculateGameTimeLimit = (selectedCountries: Country[]) => {
        const totalRoundTime = selectedCountries.reduce((sum, country) => {
            return sum + calculateRoundTimeLimit(country.popRank);
        }, 0);

        return Math.round(totalRoundTime * 0.9 * 10) / 10; // 90% of total, rounded to 1 decimal
    };

    // Handle expired round
    const handleExpiredRound = () => {
        // Mark the current round as expired
        setScores([...scores, {
            guess: currentCountry, // Using current country as placeholder
            correct: currentCountry,
            isCorrect: false,
            timeElapsed: timedMode ? calculateRoundTimeLimit(currentCountry.popRank) : roundTime,
            skipped: false,
            expired: true
        }]);

        const nextRound = round + 1;
        if (nextRound >= countries.length) {
            setGameActive(false);
            setGameOver(true);
        } else {
            setCurrentCountry(countries[nextRound]);
            setRound(nextRound);
            // Reset round timer for next round
            if (timedMode) {
                setRoundTimeRemaining(calculateRoundTimeLimit(countries[nextRound].popRank));
            } else {
                setRoundTime(0);
            }
        }
    };

    // Handle expired game
    const handleExpiredGame = () => {
        // Mark current round and all remaining rounds as expired
        const remainingScores: RoundScore[] = [];

        // Current round
        remainingScores.push({
            guess: currentCountry,
            correct: currentCountry,
            isCorrect: false,
            timeElapsed: calculateRoundTimeLimit(currentCountry.popRank) - roundTimeRemaining,
            skipped: false,
            expired: true
        });

        // All subsequent rounds
        for (let i = round + 1; i < countries.length; i++) {
            remainingScores.push({
                guess: countries[i],
                correct: countries[i],
                isCorrect: false,
                timeElapsed: 0,
                skipped: false,
                expired: true
            });
        }

        setScores([...scores, ...remainingScores]);
        setGameActive(false);
        setGameOver(true);
    };

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

    const onGameStart = (timed: boolean = false) => {
        const success = calculateCountries();
        if (success) {
            setTimedMode(timed);
            setGameActive(true);
            setGameOver(false);
            setTotalTime(0);
            setRoundTime(0);
            setScores([]);
            setRound(0);

            if (timed) {
                // Calculate time limits for timed mode
                const roundLimit = calculateRoundTimeLimit(countries[0].popRank);
                const gameLimit = calculateGameTimeLimit(countries);

                setRoundTimeLimit(roundLimit);
                setGameTimeLimit(gameLimit);
                setRoundTimeRemaining(roundLimit);
                setGameTimeRemaining(gameLimit);
            }
        }
    }


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

    const onMapSelection = (countryName: string) => {
        const guess = countryData.find(s => s.name === countryName);
        if (guess) {
            // Include the round time in the score
            setScores([...scores, {
                guess,
                correct: currentCountry,
                isCorrect: countryName === currentCountry.name,
                timeElapsed: timedMode ?
                    (calculateRoundTimeLimit(currentCountry.popRank) - roundTimeRemaining) :
                    roundTime,
                skipped: false,
                expired: false
            }]);

            const nextRound = round + 1;
            if (nextRound >= countries.length) {
                setGameActive(false);
                setGameOver(true);
            } else {
                setCurrentCountry(countries[nextRound]);
                setRound(nextRound);
                // Reset round timer for next round
                if (timedMode) {
                    setRoundTimeRemaining(calculateRoundTimeLimit(countries[nextRound].popRank));
                } else {
                    setRoundTime(0);
                }
            }
        }
    }

    // Format time to display with one decimal place
    const formatTime = (time: number) => {
        return time.toFixed(1);
    }

    // Update skip round function for timed mode
    const skipRound = () => {
        // Mark the current round as skipped and incorrect
        setScores([...scores, {
            guess: currentCountry, // Using current country as guess for simplicity
            correct: currentCountry,
            isCorrect: false,
            timeElapsed: timedMode ?
                (calculateRoundTimeLimit(currentCountry.popRank) - roundTimeRemaining) :
                roundTime,
            skipped: true,
            expired: false
        }]);

        const nextRound = round + 1;
        if (nextRound >= countries.length) {
            setGameActive(false);
            setGameOver(true);
        } else {
            setCurrentCountry(countries[nextRound]);
            setRound(nextRound);
            // Reset round timer for next round
            if (timedMode) {
                setRoundTimeRemaining(calculateRoundTimeLimit(countries[nextRound].popRank));
            } else {
                setRoundTime(0);
            }
        }
    }

    // Update quit game function for timed mode
    const quitGame = () => {
        // Mark all remaining rounds as skipped and incorrect
        const remainingScores: RoundScore[] = [];
        for (let i = round; i < countries.length; i++) {
            remainingScores.push({
                guess: countries[i], // Using current country as guess for simplicity
                correct: countries[i],
                isCorrect: false,
                timeElapsed: i === round ?
                    (timedMode ?
                        (calculateRoundTimeLimit(countries[i].popRank) - roundTimeRemaining) :
                        roundTime) :
                    0, // Current round has elapsed time, others 0
                skipped: true,
                expired: false
            });
        }

        setScores([...scores, ...remainingScores]);
        setGameActive(false);
        setGameOver(true);
    }

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
                    <Row className="mt-3">
                        <Col>
                            <Button variant="primary" size="lg" className="me-3" onClick={() => onGameStart(false)}>
                                Start Game
                            </Button>
                            <Button variant="warning" size="lg" onClick={() => onGameStart(true)}>
                                Start Timed Mode
                            </Button>
                        </Col>
                    </Row>
                </Form>
            )}
            {gameActive && (
                <>
                    <Card className="mb-3">
                        <Card.Header className="d-flex align-items-center justify-content-between pb-0">
                            <h3>{currentCountry?.name} {currentCountry.flagUnicode}</h3>
                            <h5 className="d-none d-md-block">
                                {timedMode ? (
                                    <Badge bg={roundTimeRemaining < 5 ? "danger" : roundTimeRemaining < 10 ? "warning" : "secondary"}>
                                        Round: {formatTime(roundTimeRemaining)}s
                                    </Badge>
                                ) : (
                                    <Badge bg="secondary">Round: {formatTime(roundTime)}s</Badge>
                                )}
                            </h5>
                            <h4 id="roundDisplay" className="me-md-3">Round {round + 1}/{countryCount}</h4>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <MapChart onSelection={onMapSelection}/>
                        </Card.Body>
                        <Card.Footer className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                {timedMode ? (
                                    <Badge bg={gameTimeRemaining < 15 ? "danger" : gameTimeRemaining < 30 ? "warning" : "success"}>
                                        Game Time: {formatTime(gameTimeRemaining)}s
                                    </Badge>
                                ) : (
                                    <Badge bg="success">Total Time: {formatTime(totalTime)}s</Badge>
                                )}
                            </h5>
                            <h5 className="d-block d-md-none mb-0">
                                {timedMode ? (
                                    <Badge bg={roundTimeRemaining < 5 ? "danger" : roundTimeRemaining < 10 ? "warning" : "secondary"}>
                                        Round: {formatTime(roundTimeRemaining)}s
                                    </Badge>
                                ) : (
                                    <Badge bg="secondary">Round: {formatTime(roundTime)}s</Badge>
                                )}
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
                <Score
                    scores={scores}
                    onRestart={onGameRestart}
                    totalTime={timedMode ? gameTimeLimit - gameTimeRemaining : totalTime}
                    timedMode={timedMode}
                    gameTimeLimit={gameTimeLimit}
                />
            )}
            <Alert className="mt-3" variant="danger" show={error}>{errorMessage}</Alert>
        </Container>
    )
}