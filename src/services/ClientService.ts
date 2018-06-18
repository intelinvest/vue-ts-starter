import {Singleton} from 'typescript-ioc';
import {Service} from '../platform/decorators/service';
import {ClientInfo, LoginRequest} from '../types/types';
import axios from 'axios';
import {HTTP} from '../platform/services/http';
import {CatchErrors} from '../platform/decorators/catchErrors';

@Service('ClientService')
@Singleton
export class ClientService {

    clientInfo: ClientInfo = null;

    async getClientInfo(request: LoginRequest): Promise<ClientInfo> {
        if (!this.clientInfo) {
            // ------------------------------ POST ------------------------------------------
            const result = await HTTP.post('/user/login', request).catch(reason => {
                console.log('REASON ', reason);
                throw new Error(reason);
            });
            this.clientInfo = await <ClientInfo>result.data;
            console.log('INIT CLIENT SERVICE', this.clientInfo);
        }
        return this.clientInfo;
    }
}