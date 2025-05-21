import React, { JSX } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://code.highcharts.com/mapdata/custom/world-continents.topo.json";

interface ContinentSelectionMapProps {
    selectedContinents: Set<string>;
    onContinentToggle: (continent: string) => void;
}

export default function ContinentSelectionMap({
                                                  selectedContinents,
                                                  onContinentToggle
                                              }: ContinentSelectionMapProps): JSX.Element {

    const handleClick = (geo: any) => {
        const continent = geo.properties.name;
        if (continent) {
            onContinentToggle(continent);
        }
    };

    return (
        <ComposableMap>
            <Geographies geography={geoUrl}>
                {({ geographies }) =>
                    geographies.map((geo) => {
                        const continent = geo.properties.name;
                        const isSelected = continent ? selectedContinents.has(continent) : false;

                        return (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                stroke="#FFF"
                                strokeWidth="1"
                                style={{
                                    default: {
                                        fill: isSelected ? "#148387" : "#999",
                                        outline: "none"
                                    },
                                    hover: {
                                        fill: "#143b87",
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
        </ComposableMap>
    );
}