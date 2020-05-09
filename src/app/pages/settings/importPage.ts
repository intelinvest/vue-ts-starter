import {Inject} from "typescript-ioc";
import {namespace} from "vuex-class/lib/bindings";
import {Component, UI, Watch} from "../../app/ui";
import {CurrencyBalances} from "../../components/currencyBalances";
import {ConfirmDialog} from "../../components/dialogs/confirmDialog";
import {FeedbackDialog} from "../../components/dialogs/feedbackDialog";
import {ExpandedPanel} from "../../components/expandedPanel";
import {ShowProgress} from "../../platform/decorators/showProgress";
import {BtnReturn} from "../../platform/dialogs/customDialog";
import {Filters} from "../../platform/filters/Filters";
import {ClientInfo} from "../../services/clientService";
import {DealsImportProvider, ImportProviderFeatures, ImportProviderFeaturesByProvider, ImportResponse, ImportService, ShareAliasItem} from "../../services/importService";
import {OverviewService} from "../../services/overviewService";
import {PortfolioParams, PortfolioService} from "../../services/portfolioService";
import {CurrencyUnit} from "../../types/currency";
import {Portfolio, Share, Status} from "../../types/types";
import {CommonUtils} from "../../utils/commonUtils";
import {FileUtils} from "../../utils/fileUtils";
import {MutationType} from "../../vuex/mutationType";
import {StoreType} from "../../vuex/storeType";
import {ImportInstructions} from "./importInstructions";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-container fluid>
            <v-card flat class="header-first-card">
                <v-card-title class="header-first-card__wrapper-title">
                    <div class="section-title header-first-card__title-text">Импорт сделок</div>
                </v-card-title>
            </v-card>
            <!-- Выбор брокера -->
            <v-card v-if="!selectedProvider" flat class="import-wrapper paddB24">
                <div class="info-block margB24">
                    Данный раздел поможет Вам перенести отчеты брокера на сервис.<br>
                    Обратите внимание, что для полного соответствия портфеля необходимо выгрузить сделки за все время, а не только за последний месяц.
                </div>
                <v-card-title class="import-wrapper-header">
                    <div class="import-wrapper-header__title">
                        Выберите своего брокера
                        <v-tooltip content-class="custom-tooltip-wrap" max-width="340px" bottom>
                            <sup class="custom-tooltip" slot="activator">
                                <v-icon>fas fa-info-circle</v-icon>
                            </sup>
                            <span>Будут отображены данные за выбранный период, начиная с даты первой сделки портфеля.</span>
                        </v-tooltip>
                    </div>
                </v-card-title>
            </v-card>
            <v-card v-if="!selectedProvider" flat class="px-0 py-0" data-v-step="0">
                <div class="providers">
                    <div v-for="provider in providers.values()" :key="provider.code" @click="onSelectProvider(provider)"
                         :class="{'item': true, 'active': selectedProvider === provider}">
                        <div :class="['item-img-block', provider.code.toLowerCase()]"></div>
                        <div class="item-text">
                            {{ provider.description }}
                        </div>
                    </div>
                </div>
            </v-card>

            <!-- Брокер выбран -->
            <v-card v-if="selectedProvider" flat class="import-wrapper">
                <v-card-text class="import-wrapper-content">
                    <!-- Иконка брокера и меню Изменить брокера -->
                    <p v-if="portfolio.overview.totalTradesCount" style="text-align: center;padding: 20px;">
                        <b>
                            Дата последней сделки {{ portfolio.overview.lastTradeDate | date }}.
                        </b>
                    </p>
                    <v-divider></v-divider>
                    <v-stepper v-model="currentStep">
                        <v-stepper-header>
                            <v-stepper-step step="1">Загрузка отчета</v-stepper-step>
                            <v-divider></v-divider>
                            <v-stepper-step step="2">Дополнительные данные</v-stepper-step>
                            <v-divider></v-divider>
                            <v-stepper-step step="3">Результат импорта</v-stepper-step>
                        </v-stepper-header>

                        <v-stepper-items>
                            <v-stepper-content step="1">
                                <div class="attachments" v-if="importProviderFeatures">
                                    <file-drop-area @drop="onFileAdd" class="attachments-file-drop">
                                        <div v-if="selectedProvider" class="attachments-file-drop__content">
                                            Перетащите файл. <span v-if="providerAllowedExtensions">Допустимые расширения файлов: <b>{{ providerAllowedExtensions }}</b></span>
                                        </div>
                                    </file-drop-area>
                                </div>
                                <div v-if="files.length && importProviderFeatures" class="attach-file">
                                    <div v-for="(file, index) in files" :key="index">
                                        <v-layout align-center class="item-files">
                                            <div>
                                                <v-list-tile-title class="item-files__name">
                                                    {{ file.name }}
                                                </v-list-tile-title>
                                                <div class="item-files__size">
                                                    {{ file.size | bytes }}
                                                </div>
                                            </div>
                                            <v-spacer></v-spacer>
                                            <div>
                                                <v-icon color="#B0B4C2" small @click="deleteFile(file)">close</v-icon>
                                            </div>
                                        </v-layout>
                                    </div>
                                </div>

                                <v-layout class="section-upload-file" wrap pb-3 column data-v-step="2">
                                    <v-layout align-center>
                                        <div v-if="importProviderFeatures && files.length" class="margT20">
                                            <v-btn color="primary" class="big_btn mr-3" @click.stop="uploadFile">Загрузить</v-btn>
                                        </div>
                                        <div v-if="importProviderFeatures && files.length" class="margT20">
                                            <file-link @select="onFileAdd" :accept="allowedExtensions" class="reselect-file-btn">
                                                Выбрать другой файл
                                            </file-link>
                                        </div>
                                    </v-layout>
                                    <div v-if="importProviderFeatures && files.length && providerAllowedExtensions" class="fs12-opacity mt-4">
                                        Допустимые расширения файлов: {{ providerAllowedExtensions }}
                                    </div>
                                    <v-layout class="margT20" align-center justify-space-between>
                                        <div>
                                            <file-link v-if="importProviderFeatures && !files.length" @select="onFileAdd" :accept="allowedExtensions" class="select-file-btn">
                                                Выбрать файл
                                            </file-link>
                                            <div v-if="importProviderFeatures && !files.length && providerAllowedExtensions" class="fs12-opacity mt-4">
                                                Допустимые расширения файлов: {{ providerAllowedExtensions }}
                                            </div>
                                        </div>

                                        <div @click="showInstruction = !showInstruction" class="btn-show-instruction" v-if="importProviderFeatures">
                                            {{ (showInstruction ? "Скрыть" : "Показать") + " инструкцию" }}
                                        </div>
                                    </v-layout>
                                </v-layout>

                                <v-menu content-class="dialog-setings-menu"
                                        transition="slide-y-transition"
                                        nudge-bottom="36" right class="setings-menu"
                                        v-if="importProviderFeatures" min-width="514" :close-on-content-click="false">
                                    <v-btn class="btn" slot="activator">
                                        Настройки
                                    </v-btn>
                                    <v-list dense>
                                        <div class="title-setings">
                                            Расширенные настройки импорта
                                        </div>
                                        <v-flex>
                                            <v-checkbox v-model="importProviderFeatures.createLinkedTrade" hide-details class="checkbox-setings">
                                                <template #label>
                                                    <span>Добавлять сделки по списанию/зачислению денежных средств
                                                        <v-menu content-class="zi-102" transition="slide-y-transition" left top :open-on-hover="true" nudge-top="12">
                                                            <sup class="custom-tooltip" slot="activator">
                                                                <v-icon>fas fa-info-circle</v-icon>
                                                            </sup>
                                                            <v-list dense>
                                                                <div class="hint-text-for-setings">
                                                                    Если включено, будут добавлены связанные сделки по зачислению/списанию денежных средств
                                                                </div>
                                                            </v-list>
                                                        </v-menu>
                                                    </span>
                                                </template>
                                            </v-checkbox>
                                            <v-checkbox v-model="importProviderFeatures.autoCommission" hide-details class="checkbox-setings">
                                                <template #label>
                                                    <span>
                                                        Автоматически рассчитывать комиссию для сделок
                                                        <v-menu content-class="zi-102" transition="slide-y-transition" left top :open-on-hover="true" nudge-top="12"
                                                                max-width="520">
                                                            <sup class="custom-tooltip" slot="activator">
                                                                <v-icon>fas fa-info-circle</v-icon>
                                                            </sup>
                                                            <v-list dense>
                                                                <div class="hint-text-for-setings">
                                                                    Если включено, комиссия для каждой сделки по ценной бумаге будет рассчитана в соответствии
                                                                    со значением фиксированной комиссии, заданной для портфеля. Если комиссия для бумаги есть в отчете
                                                                    она не будет перезаписана.
                                                                </div>
                                                            </v-list>
                                                        </v-menu>
                                                    </span>
                                                </template>
                                            </v-checkbox>
                                            <v-checkbox v-model="importProviderFeatures.autoEvents" hide-details class="checkbox-setings">
                                                <template #label>
                                                    <span>
                                                        Автоматически исполнять события по бумагам
                                                        <v-menu content-class="zi-102" transition="slide-y-transition" left top :open-on-hover="true" nudge-top="12"
                                                                max-width="520">
                                                            <sup class="custom-tooltip" slot="activator">
                                                                <v-icon>fas fa-info-circle</v-icon>
                                                            </sup>
                                                            <v-list dense>
                                                                <div class="hint-text-for-setings">
                                                                    Если включено, события (дивиденды, купоны, амортизация, погашение) по сделкам,
                                                                    полученным из отчета (на даты первой и последней сделки),
                                                                    будут автоматически исполнены после импорта.
                                                                </div>
                                                            </v-list>
                                                        </v-menu>
                                                    </span>
                                                </template>
                                            </v-checkbox>
                                            <v-checkbox v-model="importProviderFeatures.confirmMoneyBalance" hide-details class="checkbox-setings">
                                                <template #label>
                                                    <span>
                                                        Спрашивать текущий остаток ДС
                                                        <v-menu content-class="zi-102" transition="slide-y-transition" left top :open-on-hover="true" nudge-top="12"
                                                                max-width="520">
                                                            <sup class="custom-tooltip" slot="activator">
                                                                <v-icon>fas fa-info-circle</v-icon>
                                                            </sup>
                                                            <v-list dense>
                                                                <div class="hint-text-for-setings">
                                                                    Если включено, то после успешного импорта будет предложено ввести текущий остаток денежных
                                                                    средств на счете. Отключите, если Вы хотите сами задать вводы и выводы денег.
                                                                </div>
                                                            </v-list>
                                                        </v-menu>
                                                    </span>
                                                </template>
                                            </v-checkbox>
                                            <v-checkbox v-model="importProviderFeatures.importMoneyTrades" hide-details class="checkbox-setings">
                                                <template #label>
                                                    <span>
                                                        Импорт сделок по денежным средствам
                                                        <v-menu content-class="zi-102" transition="slide-y-transition" left top :open-on-hover="true" nudge-top="12"
                                                                max-width="520">
                                                            <sup class="custom-tooltip" slot="activator">
                                                                <v-icon>fas fa-info-circle</v-icon>
                                                            </sup>
                                                            <v-list dense>
                                                                <div class="hint-text-for-setings">
                                                                    Если включено, то из отчета будут импортированы сделки по денежным средствам.
                                                                    Отключите, если Вы не хотите загружать сделки по движению денежных средств.
                                                                </div>
                                                            </v-list>
                                                        </v-menu>
                                                    </span>
                                                </template>
                                            </v-checkbox>
                                        </v-flex>
                                    </v-list>
                                </v-menu>

                                <import-instructions v-if="showInstruction && portfolioParams" :provider="selectedProvider" @selectProvider="onSelectProvider"
                                                     @changePortfolioParams="changePortfolioParams" :portfolio-params="portfolioParams" class="margT20"></import-instructions>
                            </v-stepper-content>

                            <v-stepper-content step="2">
                                <v-card class="dialog-wrap import-dialog-wrapper">
                                    <currency-balances v-if="importProviderFeatures.confirmMoneyBalance || true" :portfolio-id="portfolio.id"
                                                       class="currency-balances"></currency-balances>
                                    <v-divider></v-divider>
                                    <v-layout column justify-space-between class="min-height-wrapper">
                                        <v-card-text v-if="shareAliases.length" class="selectable">
                                            <div v-for="aliasItem in shareAliases" :key="aliasItem.alias">
                                                <v-layout align-center justify-start wrap row fill-height class="mt-2 mb-2">
                                                    <!-- Алиас бумаги -->
                                                    <v-flex xs12 sm4>
                                                        <span class="fs12" :title="aliasItem.alias">{{ aliasDescription(aliasItem) }}</span>
                                                    </v-flex>

                                                    <!-- Выбранная бумага -->
                                                    <v-flex xs12 sm8>
                                                        <share-search @change="onShareSelect($event, aliasItem)" @clear="onShareClear(aliasItem)"
                                                                      @requestNewShare="onRequestNewShare"
                                                                      autofocus ellipsis allow-request></share-search>
                                                    </v-flex>
                                                </v-layout>
                                            </div>
                                        </v-card-text>
                                    </v-layout>

                                    <v-btn color="primary" class="big_btn" @click.native="goToFinalStep">Далее</v-btn>
                                </v-card>
                            </v-stepper-content>

                            <v-stepper-content step="3">
                                <div>
                                    <span>icon</span>
                                    <span>Успех</span>
                                    <span>Добавлено 185 сделок</span>
                                </div>
                                <span>Портфель почти сформирован, для полного соответствия требуются дополнительные данные</span>
                                <expanded-panel name="dividends" :value="[true]" class="mt-3 selectable" disabled always-open>
                                    <template #header>
                                        <span>Отчет не содержит информацию по дивидендам</span>
                                    </template>
                                    <span>content</span>
                                </expanded-panel>

                                <expanded-panel name="tickers" :value="[true]" class="mt-3 selectable" disabled always-open>
                                    <template #header>
                                        <span>Не распознаны тикеры средующий бумаг</span>
                                    </template>
                                    <span>content</span>
                                </expanded-panel>

                                <expanded-panel name="residuals" :value="[true]" class="mt-3 selectable" disabled always-open>
                                    <template #header>
                                        <span>Остаток денежных средств может отличаться от брокера</span>
                                    </template>
                                    <span>content</span>
                                </expanded-panel>
                            </v-stepper-content>
                        </v-stepper-items>
                    </v-stepper>
                </v-card-text>
            </v-card>
        </v-container>
    `,
    components: {CurrencyBalances, ImportInstructions, ExpandedPanel}
})
export class ImportPage extends UI {

    /** Текст ошибки о дублировании сделки */
    private static readonly DUPLICATE_MSG = "Сделка уже была импортирована ранее";
    /** Ошибка о репо */
    private static readonly REPO_TRADE_MSG = "Импорт сделки РЕПО не производится.";
    /** Максимальный размер загружаемого файла 10 Мб */
    readonly MAX_SIZE = 1024 * 1024 * 10;
    @MainStore.Getter
    private clientInfo: ClientInfo;
    @MainStore.Getter
    private portfolio: Portfolio;
    @MainStore.Action(MutationType.RELOAD_PORTFOLIO)
    private reloadPortfolio: (id: number) => Promise<void>;
    @Inject
    private importService: ImportService;
    @Inject
    private overviewService: OverviewService;
    @Inject
    private portfolioService: PortfolioService;
    /** Все провайдеры импорта */
    private importProviderFeaturesByProvider: ImportProviderFeaturesByProvider = null;
    /** Настройки импорта для выбранного провайдера */
    private importProviderFeatures: ImportProviderFeatures = null;
    /** Файлы для импорта */
    private files: File[] = [];
    /** Провайдеры отчетов */
    private providers = DealsImportProvider;
    /** Выбранный провайдер */
    private selectedProvider: DealsImportProvider = null;
    /** Признак отображения панели с расширенными настройками */
    private showExtendedSettings = false;
    /** Допустимые MIME типы */
    private allowedExtensions = FileUtils.ALLOWED_MIME_TYPES;
    /** Отображение инструкции к провайдеру */
    private showInstruction: boolean = true;
    private portfolioParams: PortfolioParams = null;
    /** Признак процесса импорта, чтобы не очищались файлы */
    private importInProgress = false;
    /** Текущий шаг */
    private currentStep = "1";

    private shareAliases: ShareAliasItem[] = [];

    /**
     * Инициализирует необходимые для работы данные
     * @inheritDoc
     */
    @ShowProgress
    async created(): Promise<void> {
        this.importProviderFeaturesByProvider = await this.importService.getImportProviderFeatures();
        this.portfolioParams = {...this.portfolio.portfolioParams};
        this.selectUserProvider();
    }

    private onShareSelect(share: Share, aliasItem: ShareAliasItem): void {
        aliasItem.share = share;
    }

    private onShareClear(aliasItem: ShareAliasItem): void {
        aliasItem.share = null;
    }

    /**
     * Вызывает диалог обратной связи для добавления новой бумаги в систему
     * @param newTicket название новой бумаги из компонента поиска
     */
    private async onRequestNewShare(newTicket: string): Promise<void> {
        const message = `Пожалуйста, добавьте бумагу ${newTicket} в систему.`;
        await new FeedbackDialog().show({clientInfo: this.clientInfo.user, message: message});
    }

    private async goToFinalStep(): Promise<void> {
        // const filled = this.shareAliases.filter(shareAlias => !!shareAlias.share);
        // const allFilled = filled.length === this.shareAliases.length;
        // if (!allFilled) {
        //     const answer = await new ConfirmDialog().show("Вы не указали соответствия для всех нераспознанных бумаг." +
        //         "Если продолжить, будут импортированы только сделки по тем бумагам, которые вы указали.");
        //     if (answer !== BtnReturn.YES) {
        //         return;
        //     }
        // }
        // await this.importService.saveShareAliases(filled);
        this.currentStep = "3";
    }

    private aliasDescription(shareAlias: ShareAliasItem): string {
        return `${shareAlias.alias}${shareAlias.currency ? ", " + CurrencyUnit.valueByCode(shareAlias.currency).symbol : ""}`;
    }

    @Watch("portfolio")
    @ShowProgress
    private async onPortfolioChange(): Promise<void> {
        if (this.importInProgress) {
            return;
        }
        this.selectUserProvider();
    }

    private selectUserProvider(): void {
        const userProvider = DealsImportProvider.values().find(provider => provider.id === this.portfolio.portfolioParams.brokerId);
        if (userProvider) {
            this.onSelectProvider(userProvider);
        } else {
            this.selectedProvider = null;
            this.importProviderFeatures = null;
        }
    }

    /**
     * Событие при добавлении вложений
     * @param {FileList} fileList список файлов
     */
    private onFileAdd(fileList: File[]): void {
        let filtered = fileList;
        if (fileList.length > 1) {
            this.$snotify.warning("Пожалуйста, загружайте по одному файлу для более точных результатов импорта.");
            filtered = [fileList[0]];
        }
        const isValid = FileUtils.checkExtension(filtered[0]);
        if (!isValid) {
            this.$snotify.warning(`Формат файла не соответствует разрешенным: ${FileUtils.ALLOWED_EXTENSION}.`);
            return;
        }
        if (filtered.map(file => file.size).reduce((previousValue: number, currentValue: number): number => previousValue + currentValue, 0) > this.MAX_SIZE) {
            this.$snotify.warning(`Максимальный размер загружаемого файла 10 Мб.`);
            return;
        }
        this.files = filtered;
    }

    /**
     * Удаляет файл
     * @param file файл
     */
    private deleteFile(file: File): void {
        const index = this.files.indexOf(file);
        if (index !== -1) {
            this.files.splice(index, 1);
        }
    }

    /**
     * Отправляет отчет на сервер и обрабатывает ответ
     */
    private async uploadFile(): Promise<void> {
        this.shareAliases = [
            {
                alias: "Газпром", currency: "USD", share: null
            },
            {
                alias: "Сбербанк", currency: "USD", share: null
            }];
        this.currentStep = "2";
        return;
        if (this.files && this.files.length && this.selectedProvider) {
            this.importInProgress = true;
            if (this.portfolio.portfolioParams.brokerId && this.portfolio.portfolioParams.brokerId !== this.selectedProvider.id) {
                const result = await new ConfirmDialog().show(`Внимание! Вы загружаете отчет брокера ${this.selectedProvider.description} в портфель,
                    в который ранее были загружены отчеты брокера ${this.getNameCurrentBroker}.
                    При продолжении импорта, могут возникнуть дубли существующих в вашем портфеле сделок.
                    Мы рекомендуем загружать отчеты разных брокеров в разные портфели и объединять их в составной портфель.`);
                if (result !== BtnReturn.YES) {
                    return;
                }
            }
            if (this.isFinam && this.portfolioParams.fixFee !== this.portfolio.portfolioParams.fixFee) {
                await this.portfolioService.createOrUpdatePortfolio(this.portfolioParams);
            }
            const response = await this.importReport();
            await this.handleUploadResponse(response);
        }
    }

    private get getNameCurrentBroker(): string {
        const provider = this.providers.values().find(item => item.id === this.portfolio.portfolioParams.brokerId);
        return provider ? provider.description : "";
    }

    /**
     * Отправляет отчет на сервер
     */
    @ShowProgress
    private async importReport(): Promise<ImportResponse> {
        return this.importService.importReport(this.selectedProvider.code, this.portfolio.id, this.files, this.importProviderFeatures);
    }

    /**
     * Обрабатывает ответ от сервера после импорта отчета
     * @param response
     */
    private async handleUploadResponse(response: ImportResponse): Promise<void> {
        if (response.status === Status.ERROR && CommonUtils.isBlank(response.generalError)) {
            this.$snotify.error(response.message);
            return;
        }
        if (response.generalError) {
            this.currentStep = "3";
            return;
        }
        let duplicateTradeErrorCount = 0;
        if (response.errors && response.errors.length) {
            const duplicateTradeErrors = response.errors.filter(error => error.message === ImportPage.DUPLICATE_MSG);
            const repoTradeErrors = response.errors.filter(error => error.message === ImportPage.REPO_TRADE_MSG);
            const errors = response.errors.filter(error => !duplicateTradeErrors.includes(error) && !repoTradeErrors.includes(error));
            duplicateTradeErrorCount = duplicateTradeErrors.length;
            // если после удаления ошибки все еще остались, отображаем диалог
            // отображаем диалог с ошибками, но информацию по портфелю надо перезагрузить если были успешно импортированы сделки
            if (errors.length) {
                this.shareAliases = errors.filter(error => error.shareNotFound).map(error => {
                    return {
                        alias: error.dealTicker,
                        currency: error.currency,
                        share: null
                    } as ShareAliasItem;
                });
                this.currentStep = "2";
                return;
            }
        }
        if (response.validatedTradesCount) {
            const firstWord = Filters.declension(response.validatedTradesCount, "Добавлена", "Добавлено", "Добавлено");
            const secondWord = Filters.declension(response.validatedTradesCount, "сделка", "сделки", "сделок");
            // let navigateToPortfolioPage = true;
            // if (this.importProviderFeatures.confirmMoneyBalance) {
            //     navigateToPortfolioPage = await new ImportSuccessDialog().show({
            //         router: this.$router,
            //         store: this.$store.state[StoreType.MAIN],
            //         validatedTradesCount: response.validatedTradesCount,
            //         duplicateTradeErrorCount
            //     }) === BtnReturn.YES;
            // }
            await this.reloadPortfolio(this.portfolio.id);
        }
        this.currentStep = "3";
    }

    /**
     * Показать инструкцию после нажатия на кнопку "CSV"
     */
    private showIntelinvestInstruction(): void {
        this.onSelectProvider(this.providers.INTELINVEST);
    }

    /**
     * Обрабатывает событие выбора провайдера из стороннего компонента
     * @param provider выбранный провайдер
     */
    private onSelectProvider(provider: DealsImportProvider): void {
        this.selectedProvider = provider;
        this.importProviderFeatures = {...this.importProviderFeaturesByProvider[provider.code]};
        if (this.selectedProvider === this.providers.INTELINVEST) {
            this.importProviderFeatures.createLinkedTrade = false;
        }
        this.clearFiles();
    }

    private clearFiles(): void {
        this.files = [];
        this.importInProgress = false;
    }

    private get isFinam(): boolean {
        return this.selectedProvider === DealsImportProvider.FINAM;
    }

    private get providerAllowedExtensions(): string {
        if (this.selectedProvider?.allowedExtensions) {
            return this.selectedProvider?.allowedExtensions.join(", ");
        }
        return "";
    }

    private changePortfolioParams(portfolioParams: PortfolioParams): void {
        this.portfolioParams = portfolioParams;
    }
}
