import React, { JSX, useState } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

interface MapProps {
    onSelection: (countryName: string) => void;
}

export default function MapChart({ onSelection }: MapProps): JSX.Element {
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const handleClick = (geo: any) => {
        const name = geo.properties.name;
        setSelectedCountry(name);
        onSelection(name);
    };

    return (
        <ComposableMap>
            <ZoomableGroup center={[0, 0]}>
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            const isSelected = geo.properties.name === selectedCountry;
                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    stroke="#FFF"
                                    strokeWidth="0.5"
                                    style={{
                                        default: { fill: isSelected ? "#148387" : "#000", outline: "none" },
                                        hover: { fill: isSelected ? "#148387" : "#143b87", outline: "none" },
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
