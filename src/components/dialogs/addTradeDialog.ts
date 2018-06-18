import {UI} from "../../app/UI";
import Component from "vue-class-component";

@Component({
    // language=Vue
    template: `
        <v-dialog v-model="showed" persistent max-width="500px">
            <v-btn slot="activator" icon>
                <v-icon>add_circle_outline</v-icon>
            </v-btn>
            <v-card>
                <v-card-title>
                    <span class="headline">User Profile</span>
                </v-card-title>
                <v-card-text>
                    <v-container grid-list-md>
                        <v-layout wrap>
                            <v-flex xs12 sm6 md4>
                                <v-text-field label="Legal first name" required></v-text-field>
                            </v-flex>
                            <v-flex xs12 sm6 md4>
                                <v-text-field label="Legal middle name" hint="example of helper text only on focus"></v-text-field>
                            </v-flex>
                            <v-flex xs12 sm6 md4>
                                <v-text-field
                                        label="Legal last name"
                                        hint="example of persistent helper text"
                                        persistent-hint
                                        required
                                ></v-text-field>
                            </v-flex>
                            <v-flex xs12>
                                <v-text-field label="Email" required></v-text-field>
                            </v-flex>
                            <v-flex xs12>
                                <v-text-field label="Password" type="password" required></v-text-field>
                            </v-flex>
                            <v-flex xs12 sm6>
                                <v-select
                                        :items="['0-17', '18-29', '30-54', '54+']"
                                        label="Age"
                                        required
                                ></v-select>
                            </v-flex>
                            <v-flex xs12 sm6>
                                <v-select
                                        :items="['Skiing', 'Ice hockey', 'Soccer', 'Basketball', 'Hockey', 'Reading', 'Writing', 'Coding', 'Basejump']"
                                        label="Interests"
                                        multiple
                                        autocomplete
                                        chips
                                ></v-select>
                            </v-flex>
                        </v-layout>
                    </v-container>
                    <small>*indicates required field</small>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="blue darken-1" flat @click.native="showed = false">Close</v-btn>
                    <v-btn color="blue darken-1" flat @click.native="showed = false">Save</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    `
})
export class AddTradeDialog extends UI {

    private showed = false;

    show(): void {
        this.showed = true;
    }

    close(): void {
        this.showed = false;
    }
}