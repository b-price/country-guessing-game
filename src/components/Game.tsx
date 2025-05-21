import {useState} from "react";
import {Alert, Button, Col, Container, Form, InputGroup, Row} from "react-bootstrap";
import MapChart from "./Map.tsx";
import {Score} from "./Score.tsx";
import ContinentSelector from "./ContinentSelector.tsx";
import countryData from '../data/countries.json' with { type: 'json' };

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
    const [selectedContinents, setSelectedContinents] = useState<string[]>(
        ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"]
    );

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

    const onGameStart = () => {
        const success = calculateCountries();
        if (success) {
            setGameActive(true);
            setGameOver(false);
        }
    }

    const handleContinentToggle = (continent: string) => {
        setSelectedContinents(prev => {
            if (prev.includes(continent)) {
                // If all continents would be deselected, show error
                if (prev.length === 1) {
                    setError(true);
                    setErrorMessage('Error: At least one continent must be selected.');
                    return prev;
                }
                return prev.filter(c => c !== continent);
            } else {
                setError(false);
                setErrorMessage('');
                return [...prev, continent];
            }
        });
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

        // Apply continent filter
        if (selectedContinents.length > 0 && selectedContinents.length < 7) {
            filteredCountries = filteredCountries.filter((country) =>
                selectedContinents.includes(country.continent)
            );
        }

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

        // Check if we have any countries after all filters
        if (filteredCountries.length === 0) {
            setError(true);
            setErrorMessage('Error: No countries match the selected filters. Please adjust your selection.');
            return false;
        }

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
    }

    const onMapSelection = (countryName: string) => {
        const guess = countryData.find(s => s.name === countryName);
        if (guess) {
            setScores([...scores, { guess, correct: currentCountry, isCorrect: countryName === currentCountry.name}]);
            const nextRound = round + 1;
            if (nextRound >= countries.length) {
                setGameActive(false);
                setGameOver(true);
            } else {
                setCurrentCountry(countries[nextRound]);
                setRound(nextRound);
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
                                <Form.Label>% of Countries in Population</Form.Label>
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
                                <Form.Label>of Countries in Population</Form.Label>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mt-4">
                        <Col>
                            <Form.Group controlId="continentFilter">
                                <Form.Label>Filter by Continent</Form.Label>
                                <ContinentSelector
                                    selectedContinents={selectedContinents}
                                    onContinentToggle={handleContinentToggle}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button variant="primary" onClick={onGameStart} className="mt-3">Start Game</Button>
                </Form>
            )}
            {gameActive && (
                <>
                    <Row className="mb-3 position-sticky top-10 z-1">
                        <Col>
                            <h3>{currentCountry?.name} {currentCountry.flagUnicode}</h3>
                        </Col>
                        <Col>
                            <h4 id="roundDisplay">Round {round + 1}/{countryCount}</h4>
                        </Col>
                    </Row>
                    <Row>
                        <MapChart onSelection={onMapSelection} />
                    </Row>
                </>
            )}
            {!gameActive && gameOver && (
                <Score scores={scores} onRestart={onGameRestart}/>
            )}
            <Alert className="mt-3" variant="danger" show={error}>{errorMessage}</Alert>
        </Container>
    )
}