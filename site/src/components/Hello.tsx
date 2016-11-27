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

    rawData = {};

    getFromDatabase() {
        var database = (window as any).firebase.database();
        var pascal = "o7jogpfea55z82x05u";
        var leia = "f4ag9lqly2ufqq9s22";
        var user = pascal;
        var xx = database.ref("/accounts/" + user + "/today").on('value', (snap: any) => {
            setTimeout(() => {
                this.rawData = snap.val();
                this.renderD3();
            })
        });
    }

    renderD3() {
        var canvas = document.getElementById('chart1') as HTMLCanvasElement;
        var ctx = canvas.getContext('2d');
        var data: any[] = [];
        var backgroundColors: any[] = [];
        var labels: string[] = [];
        for (var hostName in this.rawData) {
            var site = (this.rawData as any)[hostName];
            console.log(hostName, site);
            var total = 0;
            for (var pageName in site) {
                var pageInfo = site[pageName];
                total += pageInfo.duration;
            }
            data.push(Math.round(total / 1000 / 6) / 10);
            labels.push(hostName);
        }
        if (labels.length > 10) {
            var other = 0;
            while (labels.length > 10) {
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
