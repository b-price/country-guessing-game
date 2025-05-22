import {useState, useEffect} from "react";
import {Alert, Button, Card, Col, Container, Form, InputGroup, Row} from "react-bootstrap";
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
    const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
    const [gameStartTime, setGameStartTime] = useState<number | null>(null);
    const [roundTime, setRoundTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);

    // Get unique continents on component mount
    useEffect(() => {
        const uniqueContinents = [...new Set(countryData.map(c => c.continent))];
        const formattedContinents = uniqueContinents.map(continent => getContinentString(continent as keyof ContinentSelectionMap));
        setAllContinents(formattedContinents);
        setSelectedContinents(new Set(formattedContinents));
    }, []);

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

    // New effect to update timers in real-time while game is active
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (gameActive && roundStartTime && gameStartTime) {
            interval = setInterval(() => {
                const now = Date.now();
                setRoundTime((now - roundStartTime) / 1000);
                setTotalTime((now - gameStartTime) / 1000);
            }, 100);  // Update every 100ms for smooth decimal display
        }
        return () => {
            if (interval) clearInterval(interval);  // Cleanup to prevent leaks
        };
    }, [gameActive, roundStartTime, gameStartTime]);

    const onGameStart = () => {
        const success = calculateCountries();
        if (success) {
            setGameActive(true);
            setGameOver(false);
            const now = Date.now();
            setGameStartTime(now);  // Start game timer
            setRoundStartTime(now);  // Start first round timer
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
        setRoundStartTime(null);  // Reset timers
        setGameStartTime(null);
        setRoundTime(0);
        setTotalTime(0);
    }

    const onMapSelection = (countryName: string) => {
        const guess = countryData.find(s => s.name === countryName);
        if (guess && roundStartTime) {
            const timeElapsed = (Date.now() - roundStartTime) / 1000;  // Calculate round time
            setScores([...scores, { guess, correct: currentCountry, isCorrect: countryName === currentCountry.name, timeElapsed }]);
            const nextRound = round + 1;
            if (nextRound >= countries.length) {
                setGameActive(false);
                setGameOver(true);
                setRoundStartTime(null);  // Stop round timer
            } else {
                setCurrentCountry(countries[nextRound]);
                setRound(nextRound);
                setRoundStartTime(Date.now());  // Reset round timer for next round
                setRoundTime(0);
            }
        }
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
                    <Button variant="primary" size="lg" onClick={onGameStart}>Start Game</Button>
                </Form>
            )}
            {gameActive && (
                <Card className="mb-3">
                    <Card.Header className="d-flex align-items-center justify-content-between pb-0">
                        <h3>{currentCountry?.name} {currentCountry.flagUnicode}</h3>
                        <div>
                            <h4 id="roundDisplay" className="d-inline me-3">Round {round + 1}/{countryCount}</h4>
                            {/* Round timer: Visible on desktop in header */}
                            <span id="roundTimer" className="d-none d-md-inline">
                                Round Time: {roundTime.toFixed(1)}s
                            </span>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <MapChart onSelection={onMapSelection}/>
                    </Card.Body>
                    {/* New Footer for timers: Shows game timer on desktop, both on mobile */}
                    <Card.Footer className="d-flex justify-content-between">
                        {/* Round timer: Visible only on mobile in footer */}
                        <span id="roundTimerMobile" className="d-md-none">
                            Round Time: {roundTime.toFixed(1)}s
                        </span>
                        {/* Game timer: Always visible in footer */}
                        <span id="gameTimer">
                            Total Time: {totalTime.toFixed(1)}s
                        </span>
                    </Card.Footer>
                </Card>
            )}
            {!gameActive && gameOver && (
                <Score scores={scores} onRestart={onGameRestart} totalTime={totalTime} />
            )}
            <Alert className="mt-3" variant="danger" show={error}>{errorMessage}</Alert>
        </Container>
    )
}