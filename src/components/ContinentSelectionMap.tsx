import React, { JSX } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import countryData from '../data/countries.json' with { type: 'json' };

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface ContinentSelectionMapProps {
    selectedContinents: Set<string>;
    onContinentToggle: (continent: string) => void;
}

export default function ContinentSelectionMap({
                                                  selectedContinents,
                                                  onContinentToggle
                                              }: ContinentSelectionMapProps): JSX.Element {
    // Create a map of country names to continents
    const countryToContinent = new Map(
        countryData.map(country => [country.name, country.continent])
    );

    const handleClick = (geo: any) => {
        const countryName = geo.properties.name;
        const continent = countryToContinent.get(countryName);
        if (continent) {
            onContinentToggle(continent);
        }
    };

    return (
        <ComposableMap>
            <ZoomableGroup center={[0, 0]}>
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            const countryName = geo.properties.name;
                            const continent = countryToContinent.get(countryName);
                            const isSelected = continent ? selectedContinents.has(continent) : false;

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    stroke="#FFF"
                                    strokeWidth="0.5"
                                    style={{
                                        default: {
                                            fill: isSelected ? "#148387" : "#999",
                                            outline: "none"
                                        },
                                        hover: {
                                            fill: isSelected ? "#148387" : "#143b87",
                                            outline: "none"
                                        },
                                        pressed: { outline: "none" }
                                    }}
                                    onClick={() => handleClick(geo)}
                                />
                            );
                        })
                    }
                </Geographies>
            </ZoomableGroup>
        </ComposableMap>
    );
}