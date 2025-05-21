// src/components/ContinentSelector.tsx
import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Badge, Col, Row } from "react-bootstrap";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Define continent regions with their approximate center coordinates
const continents = [
    { name: "Africa", center: [20, 0] },
    { name: "Asia", center: [90, 30] },
    { name: "Europe", center: [15, 50] },
    { name: "North America", center: [-100, 40] },
    { name: "South America", center: [-60, -15] },
    { name: "Oceania", center: [140, -25] },
    { name: "Antarctica", center: [0, -80] }
];

// Map countries to continents (simplified approach)
const getContinentForCountry = (countryName: string): string => {
    // This would be replaced with actual mapping logic
    // For now, we'll use a simplified approach based on the data structure
    return continents.find(c => c.name === countryName)?.name || "";
};

interface ContinentSelectorProps {
    selectedContinents: string[];
    onContinentToggle: (continent: string) => void;
}

const ContinentSelector: React.FC<ContinentSelectorProps> = ({
                                                                 selectedContinents,
                                                                 onContinentToggle
                                                             }) => {
    // Function to determine if a geography belongs to a specific continent
    const getContinentFromGeo = (geo: any): string => {
        // This is a simplified approach - in a real implementation,
        // you would have a more accurate mapping of countries to continents
        const { continent } = geo.properties;
        return continent || getContinentForCountry(geo.properties.name);
    };

    return (
        <>
            <Row className="mb-3">
                <Col>
                    <h5>Selected Continents:</h5>
                    <div>
                        {continents.map(continent => (
                            <Badge
                                key={continent.name}
                                bg={selectedContinents.includes(continent.name) ? "primary" : "secondary"}
                                className="me-2 mb-2"
                                style={{ cursor: "pointer" }}
                                onClick={() => onContinentToggle(continent.name)}
                            >
                                {continent.name}
                            </Badge>
                        ))}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <ComposableMap projection="geoMercator">
                        <ZoomableGroup center={[0, 0]} zoom={1}>
                            <Geographies geography={geoUrl}>
                                {({ geographies }) =>
                                    geographies.map((geo) => {
                                        const continent = getContinentFromGeo(geo);
                                        const isSelected = selectedContinents.includes(continent);

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                onClick={() => {
                                                    if (continent) onContinentToggle(continent);
                                                }}
                                                style={{
                                                    default: {
                                                        fill: isSelected ? "#148387" : "#d3d3d3",
                                                        outline: "none"
                                                    },
                                                    hover: {
                                                        fill: isSelected ? "#0e6669" : "#a9a9a9",
                                                        outline: "none"
                                                    },
                                                    pressed: { outline: "none" }
                                                }}
                                            />
                                        );
                                    })
                                }
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>
                </Col>
            </Row>
        </>
    );
};

export default ContinentSelector;