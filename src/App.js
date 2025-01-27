import React, { useEffect, useRef, useState } from "react";

const RENDER_DATA_URL = "http://localhost:5005/api/render-data";
const UPDATE_SIMULATION_URL = "http://localhost:5005/api/simulation/update";

function App() {
  const canvasRef = useRef(null);
  const [renderData, setRenderData] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Fetch render data from the backend
  const fetchRenderData = async () => {
    try {
      const response = await fetch(RENDER_DATA_URL);
      const data = await response.json();

      // Calculate bounding box
      const lanes = data.lanes;
      const maxX = Math.max(...lanes.map((lane) => Math.max(lane.startx, lane.endx)));
      const maxY = Math.max(...lanes.map((lane) => Math.max(lane.starty, lane.endy)));
      const minX = Math.min(...lanes.map((lane) => Math.min(lane.startx, lane.endx)));
      const minY = Math.min(...lanes.map((lane) => Math.min(lane.starty, lane.endy)));

      // Calculate zoom and offset based on canvas size
      const canvas = canvasRef.current;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const zoomX = canvasWidth / (maxX - minX);
      const zoomY = canvasHeight / (maxY - minY);
      const newZoom = Math.min(zoomX, zoomY);

      setZoom(newZoom);
      setOffset({ x: -minX, y: -minY }); // Offset world to fit in the canvas
      setRenderData(data);
    } catch (error) {
      console.error("Error fetching render data:", error);
    }
  };

  // Trigger simulation update on the backend
  const updateSimulation = async () => {
    try {
      const response = await fetch(UPDATE_SIMULATION_URL, { method: "POST" });
      const result = await response.json();
      console.log("Simulation updated:", result);
    } catch (error) {
      console.error("Error updating simulation:", error);
    }
  };

  // Periodically fetch render data and update simulation
  useEffect(() => {
    const updateInterval = setInterval(() => {
      updateSimulation();
      fetchRenderData();
    }, 100); // Adjust interval as needed (e.g., 10 FPS)

    return () => clearInterval(updateInterval); // Cleanup interval on unmount
  }, []);

  // Handle window resize for dynamic zoom
  useEffect(() => {
    const handleResize = () => {
      if (renderData) {
        const lanes = renderData.lanes;
        const maxX = Math.max(...lanes.map((lane) => Math.max(lane.startx, lane.endx)));
        const maxY = Math.max(...lanes.map((lane) => Math.max(lane.starty, lane.endy)));
        const minX = Math.min(...lanes.map((lane) => Math.min(lane.startx, lane.endx)));
        const minY = Math.min(...lanes.map((lane) => Math.min(lane.starty, lane.endy)));

        const canvas = canvasRef.current;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const zoomX = canvasWidth / (maxX - minX);
        const zoomY = canvasHeight / (maxY - minY);
        const newZoom = Math.min(zoomX, zoomY);

        setZoom(newZoom);
        setOffset({ x: -minX, y: -minY });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderData]);

  // Draw the simulation
  useEffect(() => {
    if (!renderData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper function to scale coordinates
    const scaleX = (x) => (x + offset.x) * zoom;
    const scaleY = (y) => (y + offset.y) * zoom;

    // Draw lanes
    renderData.lanes.forEach((lane) => {
      ctx.beginPath();
      ctx.moveTo(scaleX(lane.startx), scaleY(lane.starty));
      ctx.lineTo(scaleX(lane.endx), scaleY(lane.endy));
      ctx.lineWidth = lane.width * zoom;
      ctx.strokeStyle = "gray"; // Lane color
      ctx.stroke();
    });

    // Draw cars
    renderData.cars.forEach((car) => {
      // console.log("Drawing car at:", car.x, car.y, "Direction:", car.direction);
      ctx.save();
      ctx.translate(scaleX(car.x), scaleY(car.y));
      ctx.rotate(car.direction); // Rotate the car based on its direction
      ctx.fillStyle = car.color;
      ctx.fillRect(
        -car.width * zoom / 2,
        -car.length * zoom / 2,
        car.width * zoom,
        car.length * zoom
      );
      ctx.restore();
    });
    // Draw traffic lights
    renderData.traffic_lights.forEach((light) => {
      const carWidth = renderData.cars[0]?.width || 1; // Default to 1 if no cars exist
      const carLength = renderData.cars[0]?.length || 1;

      const lightWidth = carWidth * 2 * zoom;
      const lightHeight = carLength * 2 * zoom;

      ctx.save();
      ctx.translate(scaleX(light.x), scaleY(light.y));
      ctx.fillStyle = light.color;

      // Draw square traffic light centered at its position
      ctx.fillRect(
        -lightWidth / 2, // Center the square
        -lightHeight / 2,
        lightWidth,
        lightHeight
      );
      ctx.restore();
    });

    // Draw traffic lights
    // renderData.traffic_lights.forEach((light) => {
    //   ctx.beginPath();
    //   ctx.arc(scaleX(light.x), scaleY(light.y), 10 * zoom, 0, 2 * Math.PI);
    //   ctx.fillStyle = light.color;
    //   ctx.fill();
    // });
  }, [renderData, zoom, offset]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          border: "1px solid black",
          display: "block",
          margin: "0 auto",
        }}
      ></canvas>
    </div>
  );
}

export default App;
