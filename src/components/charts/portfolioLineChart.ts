import {UI} from '../../app/UI';
import Component from 'vue-class-component';
import {PortfolioService} from '../../services/PortfolioService';
import {Container} from 'typescript-ioc';
import {Portfolio} from '../../types/types';
import {StoreType} from '../../vuex/storeType';
import {namespace} from 'vuex-class/lib/bindings';
import Highcharts, {ChartObject, Gradient} from 'highcharts';
import exporting from 'highcharts/modules/exporting';
// tslint:disable-next-line
import Highcharts3D from 'highcharts/highcharts-3d'
//import * as highcharts3d from 'highcharts/highcharts-3d'

Highcharts3D(Highcharts);
exporting(Highcharts);

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <div>
            <v-container grid-list-md text-xs-center v-if="!chart">
                <v-layout row wrap>
                    <v-flex xs12>
                        <v-progress-circular :size="70" :width="7" indeterminate
                                             color="indigo"></v-progress-circular>
                    </v-flex>
                </v-layout>
            </v-container>

            <div v-show="chart" ref="container" style="min-width: 500px; width: 100%; height: 500px; margin: 0 auto"></div>
        </div>
    `
})
export class PortfolioLineChart extends UI {

    $refs: {
        container: HTMLElement
    };

    @MainStore.Getter
    private portfolio: Portfolio;

    private chartData: any[] = [];

    private chart: ChartObject = null;

    private portfolioService = (<PortfolioService>Container.get(PortfolioService));

    private async mounted(): Promise<void> {
        this.chartData = await this.portfolioService.getCostChart(this.portfolio.id);
        await this.draw(this.chartData);
    }

    private async draw(chartData: any[]): Promise<void> {
        this.chart = Highcharts.chart(this.$refs.container, {
            chart: {
                zoomType: 'x',
                backgroundColor: null
            },
            title: {
                text: ''
            },
            subtitle: {
                text: 'Выделите участок для увеличения'
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            yAxis: {
                title: {
                    text: 'Стоимость портфеля'
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            [1, (Highcharts.Color(Highcharts.getOptions().colors[0]) as Gradient).setOpacity(0).get('rgba')]
                        ]
                    },
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },

            series: [{
                type: 'area',
                name: this.portfolio.portfolioParams.name,
                data: this.chartData
            }],
            exporting: {
                enabled: true
            }
        });
    }
}