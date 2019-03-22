import {Inject} from "typescript-ioc";
import Component from "vue-class-component";
import {Prop, Watch} from "vue-property-decorator";
import {namespace} from "vuex-class";
import {UI} from "../app/ui";
import {ClientService} from "../services/clientService";
import {TableHeadersState, TABLES_NAME, TablesService} from "../services/tablesService";
import {TradeFields} from "../services/tradeService";
import {AssetType} from "../types/assetType";
import {BigMoney} from "../types/bigMoney";
import {Operation} from "../types/operation";
import {Portfolio, TableHeader, TablePagination, TradeRow} from "../types/types";
import {CommonUtils} from "../utils/commonUtils";
import {TradeUtils} from "../utils/tradeUtils";
import {MutationType} from "../vuex/mutationType";
import {StoreType} from "../vuex/storeType";
import {AddTradeDialog} from "./dialogs/addTradeDialog";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-data-table class="data-table" :headers="headers" :items="trades" item-key="id" :pagination.sync="tradePagination.pagination"
                      :total-items="tradePagination.totalItems" :custom-sort="customSort"
                      :no-data-text="tradePagination.totalItems ? 'Ничего не найдено' : 'Добавьте свою первую сделку и она отобразится здесь'" hide-actions>
            <template #items="props">
                <tr class="selectable" @dblclick="props.expanded = !props.expanded">
                    <td>
                        <span @click="props.expanded = !props.expanded" class="data-table-cell" :class="{'data-table-cell-open': props.expanded, 'path': true}"></span>
                    </td>
                    <td v-if="tableHeadersState.ticker" class="text-xs-left">
                        <stock-link v-if="props.item.asset === 'STOCK'" :ticker="props.item.ticker"></stock-link>
                        <bond-link v-if="props.item.asset === 'BOND'" :ticker="props.item.ticker"></bond-link>
                        <span v-if="props.item.asset === 'MONEY'">{{ props.item.ticker }}</span>
                    </td>
                    <td v-if="tableHeadersState.name" class="text-xs-left">{{ props.item.companyName }}</td>
                    <td v-if="tableHeadersState.operationLabel" class="text-xs-left">{{ props.item.operationLabel }}</td>
                    <td v-if="tableHeadersState.date" class="text-xs-center">{{ getTradeDate(props.item) }}</td>
                    <td v-if="tableHeadersState.quantity" class="text-xs-right ii-number-cell">{{ props.item.quantity }}</td>
                    <td v-if="tableHeadersState.price" :class="['text-xs-right', 'ii-number-cell']">
                        {{ getPrice(props.item) }}&nbsp;<span class="second-value">{{ currencyForPrice(props.item) }}</span>
                    </td>
                    <td v-if="tableHeadersState.facevalue" :class="['text-xs-right', 'ii-number-cell']">
                        {{ props.item.facevalue | amount(false, null, false) }}&nbsp;<span class="second-value">{{ props.item.facevalue | currencySymbol }}</span>
                    </td>
                    <td v-if="tableHeadersState.nkd" :class="['text-xs-right', 'ii-number-cell']">
                        {{ props.item.nkd | amount(false, null, false) }}&nbsp;<span class="second-value">{{ props.item.nkd | currencySymbol }}</span>
                    </td>
                    <td v-if="tableHeadersState.fee" :class="['text-xs-right', 'ii-number-cell']">
                        {{ getFee(props.item) }}&nbsp;<span class="second-value">{{ props.item.fee | currencySymbol }}</span>
                    </td>
                    <td v-if="tableHeadersState.signedTotal" :class="['text-xs-right', 'ii-number-cell']">
                        {{ props.item.signedTotal | amount(true) }}&nbsp;<span class="second-value">{{ props.item.signedTotal | currencySymbol }}</span>
                    </td>
                    <td v-if="tableHeadersState.totalWithoutFee" :class="['text-xs-right', 'ii-number-cell']">
                        {{ props.item.totalWithoutFee | amount }}&nbsp;<span class="second-value">{{ props.item.totalWithoutFee | currencySymbol }}</span>
                    </td>
                    <td v-if="props.item.parentTradeId" class="justify-center px-0" style="text-align: center" @click.stop>
                        <v-tooltip content-class="custom-tooltip-wrap" :max-width="250" top>
                            <a slot="activator">
                                <v-icon color="primary" small>fas fa-link</v-icon>
                            </a>
                            <span>
                                Это связанная сделка, отредактируйте основную сделку для изменения.
                            </span>
                        </v-tooltip>
                    </td>
                    <td v-else class="justify-center px-0" style="text-align: center" @click.stop="openEditTradeDialog(props.item)">
                        <a>
                            <v-icon color="primary" small>fas fa-pencil-alt</v-icon>
                        </a>
                    </td>
                    <td class="justify-center layout px-0" @click.stop>
                        <v-menu transition="slide-y-transition" bottom left>
                            <v-btn slot="activator" flat icon dark>
                                <span class="menuDots"></span>
                            </v-btn>
                            <v-list dense>
                                <v-list-tile v-if="!isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.BUY)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-plus</v-icon>
                                        Купить
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="!isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.SELL)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-minus</v-icon>
                                        Продать
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.DEPOSIT)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-plus</v-icon>
                                        Внести
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.WITHDRAW)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-minus</v-icon>
                                        Вывести
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.INCOME)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>far fa-grin-beam</v-icon>
                                        Доход
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isMoneyTrade(props.item)" @click="openTradeDialog(props.item, operation.LOSS)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>far fa-sad-tear</v-icon>
                                        Расход
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isStockTrade(props.item)" @click="openTradeDialog(props.item, operation.DIVIDEND)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-calendar-alt</v-icon>
                                        Дивиденд
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isBondTrade(props.item)" @click="openTradeDialog(props.item, operation.COUPON)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-calendar-alt</v-icon>
                                        Купон
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isBondTrade(props.item)" @click="openTradeDialog(props.item, operation.AMORTIZATION)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-hourglass-half</v-icon>
                                        Амортизация
                                    </v-list-tile-title>
                                </v-list-tile>
                                <v-list-tile v-if="isBondTrade(props.item)" @click="openTradeDialog(props.item, operation.REPAYMENT)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-recycle</v-icon>
                                        Погашение
                                    </v-list-tile-title>
                                </v-list-tile>
                                <!-- Связанную сделку удалить можно только удалив родительскую -->
                                <v-divider v-if="!props.item.parentTradeId"></v-divider>
                                <v-list-tile v-if="!props.item.parentTradeId" @click="deleteTrade(props.item)">
                                    <v-list-tile-title>
                                        <v-icon color="primary" small>fas fa-trash-alt</v-icon>
                                        Удалить
                                    </v-list-tile-title>
                                </v-list-tile>
                            </v-list>
                        </v-menu>
                    </td>
                </tr>
            </template>

            <template #expand="props">
                <table class="ext-info" @click.stop>
                    <tr>
                        <td>
                            <div class="ext-info__item">
                                <template v-if="tableHeadersState.ticker && props.item.asset !== 'MONEY'">
                                    Тикер
                                    <span class="ext-info__ticker">
                                        <stock-link v-if="props.item.asset === 'STOCK'" :ticker="props.item.ticker"></stock-link>
                                        <bond-link v-if="props.item.asset === 'BOND'" :ticker="props.item.ticker"></bond-link>
                                    </span>
                                </template>
                                <template v-if="tableHeadersState.ticker && props.item.asset === 'MONEY'">
                                    Тип {{ props.item.ticker }}
                                </template>
                                <br>
                                <template v-if="props.item.companyName">Название {{ props.item.companyName }}<br></template>
                                Заметка {{ props.item.note }}
                            </div>
                        </td>
                        <td>
                            <div class="ext-info__item">
                                Операция {{ props.item.operationLabel }}<br>
                                Дата {{ getTradeDate(props.item) }}<br>
                                <template v-if="props.item.quantity">Количество {{ props.item.quantity }} <span>шт.</span></template>
                            </div>
                        </td>
                        <td>
                            <div class="ext-info__item">
                                <template v-if="getPrice(props.item)">Цена {{ getPrice(props.item) }} <span>{{ currencyForPrice(props.item) }}</span><br></template>
                                <template v-if="props.item.facevalue">
                                    Номинал {{ props.item.facevalue | amount }} <span>{{ props.item.facevalue | currencySymbol }}</span><br>
                                </template>
                                <template v-if="props.item.nkd">НКД {{ props.item.nkd | amount }} <span>{{ props.item.nkd | currencySymbol }}</span></template>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="ext-info__item">
                                <template v-if="props.item.signedTotal">
                                    Сумма {{ props.item.signedTotal | amount(true) }} <span>{{ props.item.signedTotal | currencySymbol }}</span><br>
                                </template>
                                <template v-if="getFee(props.item)">Комиссия {{ getFee(props.item) }} <span>{{ props.item.fee | currencySymbol }}</span><br></template>
                                <template v-if="props.item.totalWithoutFee">
                                    Сумма без комиссии {{ props.item.totalWithoutFee | amount }} <span>{{ props.item.totalWithoutFee | currencySymbol }}</span>
                                </template>
                            </div>
                        </td>
                        <td>
                            <div class="ext-info__item">
                            </div>
                        </td>
                        <td>
                            <div class="ext-info__item">
                            </div>
                        </td>
                    </tr>
                </table>
            </template>
        </v-data-table>
    `
})
export class TradesTable extends UI {

    @Inject
    private tablesService: TablesService;
    @Inject
    private clientService: ClientService;
    @MainStore.Action(MutationType.RELOAD_PORTFOLIO)
    private reloadPortfolio: (id: string) => Promise<void>;
    @MainStore.Getter
    private portfolio: Portfolio;
    /** Список заголовков таблицы */
    @Prop()
    private headers: TableHeader[];
    /** Список отображаемых строк */
    @Prop({default: [], required: true})
    private trades: TradeRow[];
    /** Паджинация таблицы */
    @Prop({required: true, type: Object})
    private tradePagination: TablePagination;
    /** Состояние столбцов таблицы */
    private tableHeadersState: TableHeadersState;
    /** Текущая операция */
    private operation = Operation;
    /** Перечисление типов таблиц */
    private TABLES_NAME = TABLES_NAME;
    /** Типы активов */
    private AssetType = AssetType;
    /** Признак доступности профессионального режима */
    private portfolioProModeEnabled = false;

    /**
     * Инициализация данных
     * @inheritDoc
     */
    async created(): Promise<void> {
        /** Установка состояния заголовков таблицы */
        this.setHeadersState();
        const clientInfo = await this.clientService.getClientInfo();
        this.portfolioProModeEnabled = TradeUtils.isPortfolioProModeEnabled(this.portfolio, clientInfo);
    }

    @Watch("headers")
    onHeadersChange(): void {
        this.setHeadersState();
    }

    setHeadersState(): void {
        this.tableHeadersState = this.tablesService.getHeadersState(this.headers);
    }

    @Watch("trades")
    private onTradesUpdate(trades: TradeRow[]): void {
        this.trades = trades;
    }

    private async openTradeDialog(trade: TradeRow, operation: Operation): Promise<void> {
        const result = await new AddTradeDialog().show({
            store: this.$store.state[StoreType.MAIN],
            router: this.$router,
            share: null,
            ticker: trade.ticker,
            operation,
            assetType: AssetType.valueByName(trade.asset)
        });
        if (result) {
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    private async openEditTradeDialog(trade: TradeRow): Promise<void> {
        const tradeFields: TradeFields = {
            ticker: trade.ticker,
            date: trade.date,
            quantity: trade.quantity,
            price: this.moneyPrice(trade) ? TradeUtils.decimal(trade.moneyPrice) : this.percentPrice(trade) ? trade.bondPrice : null,
            facevalue: trade.facevalue,
            nkd: trade.nkd,
            perOne: null,
            fee: BigMoney.isEmptyOrZero(trade.fee) ? null : trade.fee,
            note: trade.note,
            keepMoney: CommonUtils.exists(trade.moneyTradeId),
            moneyAmount: trade.signedTotal,
            currency: trade.currency
        };
        const result = await new AddTradeDialog().show({
            store: this.$store.state[StoreType.MAIN],
            router: this.$router,
            assetType: AssetType.valueByName(trade.asset),
            operation: Operation.valueByName(trade.operation),
            tradeFields: tradeFields,
            tradeId: trade.id,
            editedMoneyTradeId: trade.moneyTradeId
        });
        if (result) {
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    private async deleteTrade(tradeRow: TradeRow): Promise<void> {
        this.$emit("delete", tradeRow);
    }

    private getTradeDate(trade: TradeRow): string {
        const date = TradeUtils.getDateString(trade.date);
        const time = TradeUtils.getTimeString(trade.date);
        return this.portfolioProModeEnabled && !!time ? `${date} ${time}` : date;
    }

    private getPrice(trade: TradeRow): string {
        return TradeUtils.getPrice(trade);
    }

    private getFee(trade: TradeRow): string {
        return TradeUtils.getFee(trade);
    }

    private percentPrice(trade: TradeRow): boolean {
        return TradeUtils.percentPrice(trade);
    }

    private moneyPrice(trade: TradeRow): boolean {
        return TradeUtils.moneyPrice(trade);
    }

    private isBondTrade(trade: TradeRow): boolean {
        return AssetType.valueByName(trade.asset) === AssetType.BOND;
    }

    private isStockTrade(trade: TradeRow): boolean {
        return AssetType.valueByName(trade.asset) === AssetType.STOCK;
    }

    private isMoneyTrade(trade: TradeRow): boolean {
        return AssetType.valueByName(trade.asset) === AssetType.MONEY;
    }

    private currencyForPrice(trade: TradeRow): string {
        return this.moneyPrice(trade) ? TradeUtils.currencySymbolByAmount(trade.moneyPrice).toLowerCase() : this.percentPrice(trade) ? "%" : "";
    }

    private currency(amount: string): string {
        const currencyCode = TradeUtils.currencySymbolByAmount(amount);
        return currencyCode ? currencyCode.toLowerCase() : "";
    }

    private customSort(items: TradeRow[], index: string, isDesc: boolean): TradeRow[] {
        return items;
    }
}
