import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

import './app.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const App = () => {
  let map;

  const mapContainer = useRef();

  // Number of steps to use in the arc and animation, more steps means
  // a smoother arc and animation, but too many steps will result in a
  // low frame rate
  const steps = 500;

  // Used to increment the value of the point measurement against the route.
  let counter = 0;

  // San Francisco, Washington DC, Toronto
  const placesArray = [[-122.414, 37.776], [-77.032, 38.913], [-79.347015, 43.651070]];

  // A single point that animates along the route.
  // Coordinates are initially set to origin.
  const point = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: placesArray[0]
        }
      }
    ]
  };

  // A simple line from origin to destinations
  const route = {
    type: 'FeatureCollection',
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: placesArray,
        },
      },
    ],
  };

  useEffect(() => {
    // eslint-disable-next-line
    map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-96, 37.8],
      zoom: 3
    });

    // Calculate the distance in kilometers between route start/end point.
    const lineDistance = turf.length(route.features[0]);

    const arc = [];

    // Draw an arc between the `origin` & `destination` of the two points
    for (let i = 0; i < lineDistance; i += lineDistance / steps) {
      const segment = turf.along(route.features[0], i);
      arc.push(segment.geometry.coordinates);
    }

    // Update the route with calculated arc coordinates
    route.features[0].geometry.coordinates = arc;

    map.on('load', async () => {
      await map.addSource('route', {
        type: 'geojson',
        data: route
      });

      await map.addSource('point', {
        type: 'geojson',
        data: point
      });

      await map.addLayer({
        id: 'route',
        source: 'route',
        type: 'line',
        paint: {
          'line-width': 2,
          'line-color': '#007cbf'
        }
      });

      await map.addLayer({
        id: 'point',
        source: 'point',
        type: 'symbol',
        layout: {
          'icon-image': 'airport-11',
          'icon-size': 2,
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      await animate(counter);
    });

    // create destination markers
    placesArray.forEach((dest) => {
      new mapboxgl.Marker()
        .setLngLat(dest)
        .setPopup(new mapboxgl.Popup({
          offset: 25,
          closeButton: false
        }).setHTML('<h3>Example Popup</h3><p>Add content here</p>'))
        .addTo(map);
    });

    return () => map.remove();
    // eslint-disable-next-line
  }, []);

  const animate = () => {
    const start =
      route.features[0].geometry.coordinates[
        counter >= steps ? counter - 1 : counter
        ];

    const end =
      route.features[0].geometry.coordinates[
        counter >= steps ? counter : counter + 1
        ];

    if (!start || !end) return;

    // Update point geometry to a new position based on counter denoting
    // the index to access the arc
    point.features[0].geometry.coordinates =
      route.features[0].geometry.coordinates[counter];

    // Calculate the bearing to ensure the icon is rotated to match the route arc
    // The bearing is calculated between the current point and the next point, except
    // at the end of the arc, which uses the previous point and the current point
    point.features[0].properties.bearing = turf.bearing(
      turf.point(start),
      turf.point(end)
    );

    // Update the source with this new data
    map.getSource('point').setData(point);

    // Request the next frame of animation as long as the end has not been reached
    if (counter < steps) {
      requestAnimationFrame(animate);
    }

    counter = counter + 1;
  };

  const handleClick = () => {
    // Set the coordinates of the original point back to origin
    point.features[0].geometry.coordinates = placesArray[0];

    // Update the source layer
    map.getSource('point').setData(point);

    // Reset the counter
    counter = 0;

    // Restart the animation
    animate(counter);
  };

  return (
    <div className="map-wrapper">
      <h2>Mapbox Test</h2>

      <div className="map-container">
        <button className="replay-btn" onClick={handleClick}>
          Replay
        </button>

        <div className="map" ref={mapContainer}/>
      </div>
    </div>
  );
};

export default App;
