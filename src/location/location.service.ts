import { Injectable } from '@nestjs/common';
import { City, State } from 'country-state-city';
import { StateResponseDto } from './dto/state-response.dto';
import { CityResponseDto } from './dto/city-response.dto';

@Injectable()
export class LocationService {
  getStates(): StateResponseDto[] {
    return State.getStatesOfCountry('BR').map((state) => ({
      name: state.name,
      isoCode: state.isoCode,
      countryCode: state.countryCode,
    }));
  }

  getCities(uf: string): CityResponseDto[] {
    return City.getCitiesOfState('BR', uf).map((city) => ({
      name: city.name,
      countryCode: city.countryCode,
      stateCode: city.stateCode,
    }));
  }
}