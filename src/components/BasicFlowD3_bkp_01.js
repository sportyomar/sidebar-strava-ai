import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {Text} from './charts/shapes/Text'
import {Square} from './charts/shapes/Square'
import {Triangle} from './charts/shapes/Triangle'

const BasicFlow = () => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 400;
    const squareWidth1 = 250;
    const squareWidth2 =  210;
    const squareWidth3 =  360;
    const squareWidth4 =  360;
    const squareHeight = 120;
    const arrowSize = 25; // Single scale variable for arrow size!

    svg.attr("width", width).attr("height", height);

    // Create square data (UPDATE)
    const squareData1 = {
      x: 50,
      y: 140,
      width: squareWidth1,
      height: squareHeight,
    };

    //   UPDATE
    const squareData2 = {
     x: 360, // or whatever spacing you prefer
     y: 140,   // same y as first square
     width: squareWidth2,
     height: squareHeight,
   };

    const squareData3 = {
     x: 670, // or whatever spacing you prefer
     y: 40,   // same y as first square
     width: squareWidth3,
     height: squareHeight,
   };


   const squareData4 = {
     x: 670, // or whatever spacing you prefer
     y: 200,   // same y as first square
     width: squareWidth4,
     height: squareHeight,
   };

    // Create equilateral triangle data for arrow (UPDATE)
    const triangleData1 = Triangle.createEquilateral(
      squareData1.x + squareWidth1 + 15, // centerX - positioned to the right of square
      squareData1.y + squareHeight / 2, // centerY - vertically centered with square
      arrowSize, // sideLength - single scale variable!
      {
        direction: "right" // pointing right for arrow flow
      }
    );

    // UPDATE
    const triangleData2 = Triangle.createEquilateral(
      squareData2.x + squareWidth2 + 15, // centerX - positioned to the right of square
      squareData2.y + squareHeight / 2, // centerY - vertically centered with square
      arrowSize, // sideLength - single scale variable!
      {
        direction: "right" // pointing right for arrow flow
      }
    );


    // Render square (UPDATE)
    const square1 = new Square(svg, squareData1, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      rx: 4,
      instanceId: "square1"
    });
    square1.render();

    // UPDATE
    const square2 = new Square(svg, squareData2, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      rx: 4,
      instanceId: "square2"
    });
    square2.render();


    const square3 = new Square(svg, squareData3, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      rx: 4,
      instanceId: "square3"
    });
    square3.render();


    const square4 = new Square(svg, squareData4, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      rx: 4,
      instanceId: "square4"
    });
    square4.render();


    // Render equilateral triangle arrow (UPDATE)
    const triangle1 = new Triangle(svg, triangleData1, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      instanceId: "triangle1"
    });
    triangle1.render();

    // UPDATE
    const triangle2 = new Triangle(svg, triangleData2, {
      fill: "#445561",
      stroke: "#445561",
      strokeWidth: 1,
      instanceId: "triangle2"
    });
    triangle2.render();


    // Render text using Text class (UPDATE)
    const textRenderer1 = new Text(svg, {
      fill: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    });

    // UPDATE
    const centerX1 = squareData1.x + 20
    const centerY1 = squareData1.y + squareData1.height / 2;
    const text1 = "Step 1\nIdentify good companies\nwith bad balance sheets";

    textRenderer1.render(centerX1, centerY1, text1);

    // UPDATE
    const textRenderer2 = new Text(svg, {
      fill: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    });

    // UPDATE
    const centerX2 = squareData2.x + 20
    const centerY2 = squareData2.y + squareData2.height / 2;
    const text2 = "Step 2\nAccumulate debt at\ndiscounts to par";

    textRenderer2.render(centerX2, centerY2, text2);


    const textRenderer3 = new Text(svg, {
      fill: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    });

    // UPDATE
    const centerX3 = squareData3.x + 20
    const centerY3 = squareData3.y + squareData3.height / 2;
    const text3 = "Step 3\nDebt defaults\nControl company by converting debt to\nequity at low entry valuation\nExit through IPO or sale";

    textRenderer3.render(centerX3, centerY3, text3);


    const textRenderer4 = new Text(svg, {
      fill: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    });

    // UPDATE
    const centerX4 = squareData4.x + 20
    const centerY4 = squareData4.y + squareData4.height / 2;
    const text4 = "Step 4\nDebt recovers\nEarn on high current cash return and gain\non principle until sale or maturity of debt";

    textRenderer4.render(centerX4, centerY4, text4);

  }, []);

  return (
    <div className="p-6 bg-white">
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{
            maxWidth: '1200px',
            backgroundColor: 'white'
          }}
        />
      </div>
    </div>
  );
};

export default BasicFlow;