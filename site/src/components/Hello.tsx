import * as React from "react";
//import * as Chart from "chart.js";
var firebase: any;
//var Chart: any;

export interface HelloProps { compiler: string; framework: string; }

export class Hello extends React.Component<HelloProps, {}> {
    constructor(props: any) {
        super(props)
        this.state = { serverOn: "?" };
        this.getFromDatabase();
    }

    rawData: any = {};

    getFromDatabase() {
        console.log("here");
        var database = (window as any).firebase.database();
        var pascal = "bEw3L72ZBMgrsMeix8bNGHec50L2";
        var leia = "5G58vqqWTsMcRJQ44sgnJjzV75E2";
        var user = pascal;
        database.ref("/user/" + user + "/records/2017-01-01").on('value', (snap: any) => {
            this.rawData = snap.val();
            this.renderD3();
        });
    }

    renderD3() {
        var canvas = document.getElementById('chart1') as HTMLCanvasElement;
        var ctx = canvas.getContext('2d');
        var data: any[] = [];
        var backgroundColors: any[] = [
            '#5DA5DA',//  (blue)
            '#60BD68',//  (green)
            '#DECF3F',//  (yellow)
            '#FAA43A',//  (orange)
            '#F15854',//  (red)
            '#F17CB0',//  (pink)
            '#B276B2',//  (purple)
            '#B2912F',//  (brown)
            '#4D4D4D' // (gray)
        ];

        var labels: string[] = [];
        for (var hostName in this.rawData.site) {
            var site = (this.rawData.site as any)[hostName];
            console.log(hostName, site);
            var total = 0;
            /*for (var pageName in site) {
                var pageInfo = site[pageName];
                total += pageInfo.timings.timed;
            }*/
            data.push(site.total);
            labels.push(hostName);
        }
        if (labels.length > 9) {
            var other = 0;
            while (labels.length >= 9) {
                var min = Math.min.apply(Math, data);
                var indexOfSmallest = data.indexOf(min);
                var minLabel = labels[indexOfSmallest];
                labels.splice(indexOfSmallest, 1);
                data.splice(indexOfSmallest, 1);
                other += min;
            }
            labels.push("Other");
            data.push(other);
        }
        var myChart = new (Chart as any)(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {}
        });
    }

    render() {
        setTimeout(() => { this.renderD3() })
        return <div>
            <canvas id="chart1" width="400" height="400"></canvas>
            <h1>Hello  {this.props.compiler}and {this.props.framework}!</h1>
            <pre>{JSON.stringify(this.state)}</pre>
        </div>;
    }
}
